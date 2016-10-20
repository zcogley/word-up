
// INITIALIZE STUFF

$(document).ready(function() {
    $("#attempted-word-form").submit(function(evt) {
        evt.preventDefault();
        var word = $("#textbox").val();
        addNewWordSubmission(word);
        render();
    });

    $("#textbox").bind("input", function() {
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
    validChars: [],
    wordSubmissions: [],
    currentAttempt: ""
}

function addNewWordSubmission(word) {
    var alreadyUsed = model.wordSubmissions.filter(function(sub) {
        return sub.word === word;
    }).length > 0;
    if (containsOnlyValidChars(word) && !alreadyUsed) {
        model.wordSubmissions.push({ word: word });
    }
    model.currentAttempt = "";
}

function startGame() {
    model.gameHasStarted = true;
    model.secondsRemaining = gameDuration;
    model.validChars = generateValidChars();
    model.wordSubmissions = [];
    model.currentAttempt = "";
    clearTimeout(model.timer);
    model.timer = tickTimer();
}

function tickTimer() {
    return setTimeout(function() {
        model.secondsRemaining = Math.max(0, model.secondsRemaining - 1);
        render();
        if (model.gameHasStarted && model.secondsRemaining > 0) {
            model.timer = tickTimer();
        }
    }, 1000);
}



function checkWordExists(word) {
    $.ajax({
        url: "http://api.pearson.com/v2/dictionaries/entries?headword=" + word,
        success: function(response) {
            model.wordSubmissions = model.wordSubmissions.map(function(sub) {
                if (sub.word === word) {
                    var isRealWord = response.results.length > 0;
                    return { word: word, isRealWord: isRealWord };
                }
                else {
                    return sub;
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
    $("#valid-chars").empty();
    $("#invalid-chars").empty();

    // scoreboard
    $("#current-score").text(currentScore());
    $("#time-remaining").text(model.secondsRemaining);

    if (model.gameHasStarted == false) {
        $("#game").hide();
        return;
    }

    $("#game").show();
    $("#valid-chars").append(model.validChars.map(charElem));
    $("#textbox").attr("disabled", false);
    $("#textbox").focus();
    $("#textbox").val(model.currentAttempt);
    $("#textbox").removeClass("bad-attempt");

    // validate the textbox
    var invalidCharElems = invalidCharTags(model.currentAttempt)
    if (invalidCharElems.length > 0) {
        $("#invalid-chars").append(invalidCharElems);
        $("#textbox").addClass("bad-attempt");
    }

    // add the word submissions
    $("#word-submissions").append(model.wordSubmissions.map(wordElem));

    if (model.secondsRemaining <= 0) {
        $("#textbox").prop("disabled", true);
        $("#textbox").val("");
    }
}

function wordElem(wordSubmission) {
    var elem = $("<span></span>")
        .text(wordSubmission.word)
        .attr("class", "tag word-submission");
    if (wordSubmission.hasOwnProperty("isRealWord")) {
        var badge = $("<span></span>")
            .text(wordSubmission.isRealWord ? wordScore(wordSubmission.word) : "X")
            .attr("class", "tag tag-sm")
            .addClass(wordSubmission.isRealWord ? "tag-success" : "tag-danger");
        elem.append(badge);
    }
    else {
        checkWordExists(wordSubmission.word);
    }
    return elem;
}

function charElem(char) {
    var badge = $("<span></span>")
        .text(charScore(char))
        .attr("class", "tag tag-default tag-sm");
    return $("<span></span>")
        .text(char)
        .attr("class", "tag valid-char")
        .append(badge);
}

function invalidCharTags(word) {
    return word.split("").filter(isNotValidChar).map(function(char) {
        return $("<span></span>").text(char).addClass("tag tag-danger");
    });
}



// GAME LOGIC

var scrabbleTiles = {
    a: 1, b: 3, c: 3, d: 2, e: 1, f: 4, g: 2, h: 4, i: 1, j: 8, k: 5, l: 1, m: 3,
    n: 1, o: 1, p: 3, q: 10, r: 1, s: 1, t: 1, u: 1, v: 4, w: 4, x: 8, y: 4, z: 10
}

function isValidChar(char) {
    return model.validChars.indexOf(char) !== -1
}

function isNotValidChar(char) {
    return isValidChar(char) == false;
}

function containsOnlyValidChars(word) {
    var chars = word.split("");
    return chars.filter(isValidChar).length === chars.length;
}

function generateValidChars() {
    return chooseN(7, Object.keys(scrabbleTiles));
}

function wordScore(word) {
    if (containsOnlyValidChars(word) == false) {
        return 0;
    }
    return word.split("").map(charScore).reduce(add, 0);
}

function charScore(char) {
    return scrabbleTiles[char.toLowerCase()];
}

function currentScore() {
    return model.wordSubmissions.map(function(wordSubmission) {
        return wordSubmission.isRealWord ? wordScore(wordSubmission.word) : 0;
    }).reduce(add, 0);
}


// UTILS

function add(a, b) {
        return a + b;
}

function chooseN(n, items) {
    var choices = [];
    for (var i = 0; i < n; i++) {
        index = Math.floor(Math.random() * items.length);
        choices.push(items[index]);
        items.splice(index, 1);
    }
    return choices;
}
