
// INITIALIZE STUFF

$(document).ready(function() {
    $("#word-attempt-form").submit(function(evt) {
        evt.preventDefault();
        var word = $("#textbox").val();
        addNewWordSubmission(word);
        render();
    });

    $("#textbox").on("input", function() {
        model.currentAttempt = $("#textbox").val().toLowerCase();
        render();
    });

    $("#new-game-button").click(function(){
        startGame();
        render();
    });

    render();
});


// MODEL

var gameDuration = 60;

var model = {
    gameHasStarted: false,
    secondsRemaining: gameDuration,
    allowedLetters: [],
    wordSubmissions: [],
    currentAttempt: ""
}

function startGame() {
    endGame();
    model.gameHasStarted = true;
    model.secondsRemaining = gameDuration;
    model.allowedLetters = generateAllowedLetters();
    model.wordSubmissions = [];
    model.currentAttempt = "";
    model.timer = startTimer();
}

function endGame() {
    stopTimer();
}

function startTimer() {
    function tick() {
        return setTimeout(function() {
            model.secondsRemaining = Math.max(0, model.secondsRemaining - 1);
            render();
            var stillTimeLeft = model.gameHasStarted && model.secondsRemaining > 0
            if (stillTimeLeft) {
                model.timer = tick();
            }
        }, 1000);
    }
    return tick();
}

function stopTimer() {
    clearTimeout(model.timer);
}

function addNewWordSubmission(word) {
    var alreadyUsed = model.wordSubmissions.filter(function(sub) {
        return sub.word === word;
    }).length > 0;
    if (containsOnlyAllowedLetters(word) && !alreadyUsed) {
        model.wordSubmissions.push({ word: word });
        checkWordExists(word);
    }
    model.currentAttempt = "";
}

function checkWordExists(word) {
    $.ajax({
        url: "http://api.pearson.com/v2/dictionaries/wordwise/entries?headword=" + word,
        success: function(response) {
            console.log(response.results);
            var isRealWord = response.results.length > 0;
            model.wordSubmissions.forEach(function(sub) {
                if (sub.word === word) {
                    sub.isRealWord = isRealWord;
                }
            });
            render();
        },
        error: function(err) {
            console.log(err);
        }
    });
}


// VIEW

function render() {

    // clear stuff
    $("#textbox").val("");
    $("#word-submissions").empty();
    $("#allowed-letters").empty();
    $("#disallowed-letters").empty();

    // update the scoreboard
    $("#current-score").text(currentScore());
    $("#time-remaining").text(model.secondsRemaining);

    // if the game has not started yet, just hide the #game container and exit
    if (model.gameHasStarted == false) {
        $("#game").hide();
        return;
    }

    // reveal the #game container
    $("#game").show();

    // render the letter tiles
    $("#allowed-letters").append(model.allowedLetters.map(letterElem));

    // render the word submissions
    $("#word-submissions").append(model.wordSubmissions.map(wordElem));

    // render the textbox
    $("#textbox")
        .val(model.currentAttempt)
        .focus()
        .removeClass("bad-attempt")
        .attr("disabled", false);

    // if the current word attempt contains disallowed letters,
    // restyle the textbox and show the disallowed letters underneath
    var disallowedLetters = disallowedLettersInWord(model.currentAttempt);
    if (disallowedLetters.length > 0) {
        $("#textbox").addClass("bad-attempt");
        $("#disallowed-letters")
            .append(disallowedLetters.map(disallowedLetterElem));
    }

    // if the game is over, disable the text box and clear its contents
    var gameOver = model.secondsRemaining <= 0
    if (gameOver) {
        $("#textbox").prop("disabled", true);
        $("#textbox").val("");
    }
}

function wordElem(wordSubmission) {
    var elem = $("<span></span>")
        .text(wordSubmission.word)
        .attr("class", "tag tag-lg word-submission");
    if (wordSubmission.hasOwnProperty("isRealWord")) {
        var scoreTag = $("<span></span>")
            .text(wordSubmission.isRealWord ? wordScore(wordSubmission.word) : "X")
            .attr("class", "tag tag-sm")
            .addClass(wordSubmission.isRealWord ? "tag-success" : "tag-danger");
        elem.append(scoreTag);
    }
    return elem;
}

function letterElem(letter) {
    var scoreTag = $("<span></span>")
        .text(letterScore(letter))
        .attr("class", "tag tag-default tag-sm");
    return $("<span></span>")
        .text(letter)
        .attr("class", "tag tag-lg allowed-letter")
        .append(scoreTag);
}

function disallowedLetterElem(letter) {
    return $("<span></span>").text(letter).addClass("tag tag-sm tag-danger");
}



// GAME LOGIC

var scrabblePointsForEachLetter = {
    a: 1, b: 3, c: 3, d: 2, e: 1, f: 4, g: 2, h: 4, i: 1, j: 8, k: 5, l: 1, m: 3,
    n: 1, o: 1, p: 3, q: 10, r: 1, s: 1, t: 1, u: 1, v: 4, w: 4, x: 8, y: 4, z: 10
}

function isAllowedLetter(letter) {
    return model.allowedLetters.indexOf(letter) !== -1
}

function isDisallowedLetter(letter) {
    return isAllowedLetter(letter) == false;
}

function containsOnlyAllowedLetters(word) {
    return disallowedLettersInWord(word).length == 0;
}

function disallowedLettersInWord(word) {
    return word.split("").filter(isDisallowedLetter);
}

function generateAllowedLetters() {
    return chooseN(7, Object.keys(scrabblePointsForEachLetter));
}

function wordScore(word) {
    if (containsOnlyAllowedLetters(word) == false) {
        return 0;
    }
    return word.split("").map(letterScore).reduce(add, 0);
}

function letterScore(letter) {
    return scrabblePointsForEachLetter[letter.toLowerCase()];
}

function currentScore() {
    return model.wordSubmissions.map(function(wordSubmission) {
        return wordSubmission.isRealWord ? wordScore(wordSubmission.word) : 0;
    }).reduce(add, 0);
}


// UTILS

/**
 * randomly selects n items from a list,
 * and returns the selected items together in a smaller list
 */
function chooseN(n, items) {
    var selectedItems = [];
    var total = Math.min(n, items.length)
    for (var i = 0; i < total; i++) {
        index = Math.floor(Math.random() * items.length);
        selectedItems.push(items[index]);
        items.splice(index, 1);
    }
    return selectedItems;
}

/**
 * adds two numbers together
 */
function add(a, b) {
    return a + b;
}
