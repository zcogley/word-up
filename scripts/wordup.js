

// ----------------- MODEL -----------------

const GAME_DURATION = 60;

// all the stuff we need to keep track of
const model = {
    // a boolean indicating whether the (first) game has started yet
  gameHasStarted: false,

    // how much time is left in the current game
  secondsRemaining: GAME_DURATION,

    // a list of the 7 letters that the player is allowed to use
  allowedLetters: [],

    // the word that the user is currently typing
  currentAttempt: '',

    // a list of the words the user has previously submitted in the current game
  wordSubmissions: [],
};

/*
 * Resets the model to a starting state, and then starts the timer
 */
function startGame() {
  endGame(); // eslint-disable-line
  model.gameHasStarted = true;
  model.secondsRemaining = GAME_DURATION;
  model.allowedLetters = generateAllowedLetters();
  model.wordSubmissions = [];
  model.currentAttempt = '';
  model.timer = startTimer();
}

/*
 * Wraps things up
 */
function endGame() {
  stopTimer();
}


/**
 * Given a word, adds a new wordSubmission to model.wordSubmissions.
 *
 * Refrains from adding a new entry if the model already contains
 * a wordSubmission whose word is the same
 */
function addNewWordSubmission(word) {
  // determines whether word has previously been used
  let alreadyUsed = false;
  model.wordSubmissions.forEach((item) => {
    if (word === item.word) {alreadyUsed = true;}
  });

    // if the word is valid and hasn't already been used, add it
  if (containsOnlyAllowedLetters(word) && alreadyUsed == false) {
    model.wordSubmissions.push({ word });
        // and now we must also determine whether this is actually a real word
    checkIfWordIsReal(word);
  }
}

/**
 * Given a word, checks to see if that word actually exists in the dictionary.
 *
 * Subsequently updates the .isRealWord property of
 * the corresponding wordSubmission in the model, and then re-renders.
 */
function checkIfWordIsReal(word) {
    // make an AJAX call to the Pearson API
  $.ajax({
    url: `http://api.pearson.com/v2/dictionaries/entries?headword=${word}`,
    success(response) {
            // If the response contains any results, then the word is legitimate.
            // Otherwise, it is not. theAnswer variable = true when there are
            // results; false otherwise
      const theAnswer = response.results.length > 0;

            // Updates the corresponding wordSubmission in the model as Real or Not
      model.wordSubmissions.forEach((item) => {
        if (item.word === word) {
          item.isRealWord = theAnswer;
        }
      });

            // re-render
      render();
    },
    error(err) {
      console.log(err);
    },
  });
}


// ----------------- VIEW -----------------

/**
 * Updates everything on screen based on the current state of the model
 */
function render() {
    // PREGAME ---------------------------------

    // update the score on the scoreboard
  $('#current-score').text(currentScore());

    // Update the curent time remaining on the scoreboard.
  $('#time-remaining').text(model.secondsRemaining);

    // if the game has not started yet, just hide the #game container and exit
  if (model.gameHasStarted == false) {
    $('#game').hide();
    return;
  }

    // GAME -------------------------------------

    // clear stuff
  $('#allowed-letters').empty();
  $('#word-submissions').empty();
  $('#textbox').removeClass('bad-attempt');
  $('.tag').remove();
  $('#textbox').attr('disabled', false);

    // reveal the #game container
  $('#game').show();

    // render the letter tiles
  const letterChips = model.allowedLetters.map(letterChip);
  $('#allowed-letters').append(letterChips);

    // Renders the word submissions
  const words = model.wordSubmissions.map(wordSubmissionChip);
  $('#word-submissions').append(words);

    // Set the value of the textbox
  $('#textbox').val(model.currentAttempt);

    // Gives focus to the textbox.
  $('#textbox').focus();


    // if the current word attempt contains disallowed letters,
  const disallowedLetters = disallowedLettersInWord(model.currentAttempt);
  if (disallowedLetters.length > 0) {
        // restyle the textbox
    $('#textbox').addClass('bad-attempt');

        // show the disallowed letters underneath
    const redLetterChips = disallowedLetters.map(disallowedLetterChip);

        // appends the red letter chips to the form
    $('#word-attempt-form').append(redLetterChips);
  }

    // if the game is over
  const gameOver = model.secondsRemaining <= 0;
  if (gameOver) {
        // disable the text box and clear its contents
    $('#textbox').attr('disabled', true);
    $('#textbox').val('');
  }
}


/**
 * Given a letter, returns an HTML element which can be used to display
 * the letter as a large "chip" above the text box
 */
function letterChip(letter) {
    // a chip to display the letter
  const letterChip = $('<span></span>')
        .text(letter)
        .attr('class', 'tag tag-lg allowed-letter');

    // a smaller chip to indicate how many points this letter is worth
  const scoreChip = $('<span></span>')
        .text(letterScore(letter))
        .attr('class', 'tag tag-default tag-sm');

  return letterChip.append(scoreChip);
}

/**
 * Given a wordSubmission, returns an HTML element which can be used to display
 * the word as a large white "chip" below the text box.
 */
function wordSubmissionChip(wordSubmission) {
    // a chip to display the word
  var wordChip = $('<span></span>')
        .text(wordSubmission.word)
        .attr('class', 'tag tag-lg word-submission');

    // if we know the status of this word (real word or not), then add a green score or red X
  if (wordSubmission.hasOwnProperty('isRealWord')) {
        // a smaller chip to indicate how many points the word is worth
    const scoreChip = $('<span></span>');

        // gives the scoreChip appropriate text content and css classes
    if (wordSubmission.isRealWord === true) {
      txt = wordScore(wordSubmission.word);
      cls = 'tag tag-sm real';}
    else {
      txt = 'X';
      cls = 'tag tag-sm not-real';
  }
    // adds correct text and classes to scoreChip
    scoreChip
      .text(txt)
      .addClass(cls);

        // appends scoreChip into wordChip
    wordChip.append(scoreChip);
  }

  return wordChip;
}

/**
 * Given a disallowed letter, returns a DOM element to display the letter
 * little red chip to display the letter
 */
function disallowedLetterChip(letter) {
  return $('<span></span>')
        .text(letter)
        .addClass('tag tag-sm tag-danger disallowed-letter');
}


// ----------------- DOM EVENT HANDLERS -----------------

$(document).ready(() => {
    // when the new game button is clicked
  $('#new-game-button').click(() => {
        // start the game and re-render
    startGame();
    render();
  });

    // event handler with a callback function.
    // When the textbox content changes,
    // updates the .currentAttempt property of the model and re-renders
  $('#textbox').on('input', () => {
    model.currentAttempt = $('#textbox').val();
    render();
  });


    // when the form is submitted
  $('#word-attempt-form').submit((evt) => {
        // we don't want the page to refresh
    evt.preventDefault();

        // add a new word from whatever they typed
    addNewWordSubmission(model.currentAttempt);

        // clear away whatever they typed
    model.currentAttempt = '';

        // re-render
    render();
  });

    // initial render
  render();
});


// ----------------- GAME LOGIC -----------------

// borrowing Scrabble's point system
const scrabblePointsForEachLetter = {
  a: 1,
  b: 3,
  c: 3,
  d: 2,
  e: 1,
  f: 4,
  g: 2,
  h: 4,
  i: 1,
  j: 8,
  k: 5,
  l: 1,
  m: 3,
  n: 1,
  o: 1,
  p: 3,
  q: 10,
  r: 1,
  s: 1,
  t: 1,
  u: 1,
  v: 4,
  w: 4,
  x: 8,
  y: 4,
  z: 10,
};

/**
 * Given a letter, checks whether that letter is "disallowed"
 * meaning it is not a member of the .allowedLetters list from the current model
 */
function isDisallowedLetter(letter) {
    // returns true if the letter is not an element of
    // the .allowedLetters list in the model
  const index = model.allowedLetters.indexOf(letter);
  if (index == -1) {
    return true;
  }

  return false;
}

/**
 * Given a word, returns a list of all the disallowed letters in that word
 * Note that the list might be empty, if it contains only allowed letters.
 */
function disallowedLettersInWord(word) {
  letters = word.split('');
  return letters.filter(isDisallowedLetter);
}

/**
 * Given a word, returns true if the word is "clean",
 * i.e. the word does not contain any disallowed letters
 */
function containsOnlyAllowedLetters(word) {
    // Returns true if the word only contains allowed letters; false otherwise
  return disallowedLettersInWord(word).length == 0;
}

/**
 * Returns a list of 7 randomly chosen letters
 * Each letter will be distinct (no repeats of the same letter)
 */
function generateAllowedLetters() {
  return chooseN(7, Object.keys(scrabblePointsForEachLetter));
}

/**
 * Given a letter, returns the score of that letter (case-insensitive)
 */
function letterScore(letter) {
  return scrabblePointsForEachLetter[letter.toLowerCase()];
}

/**
 * Given a word, returns its total score,
 * which is computed by summing the scores of each of its letters.
 *
 * Returns a score of 0 if the word contains any disallowed letters.
 */
function wordScore(word) {
    // split the word into a list of letters
  const letters = word.split('');

    // Map the list of letters into a list of scores, one for each letter.
  const letterScores = letters.map(letterScore);

    // return the total sum of the letter scores
  return letterScores.reduce(add, 0);
}


/**
 * Returns the user's current total score, which is the sum of the
 * scores of all the wordSubmissions whose word is a real dictionary word
 */
function currentScore() {
    // a list of scores, one for each word submission
  const wordScores = model.wordSubmissions.map((submission) => {
    if (submission.isRealWord) {
      return wordScore(submission.word);
    }
    return 0;
  });

    // returns the total sum of the word scores
  return wordScores.reduce(add, 0);
}


// ----------------- UTILS -----------------

/**
 * Randomly selects n items from a list.
 * Returns the selected items together in a (smaller) list.
 */
function chooseN(n, items) {
  const selectedItems = [];
  const total = Math.min(n, items.length);
  for (let i = 0; i < total; i++) {
    index = Math.floor(Math.random() * items.length);
    selectedItems.push(items[index]);
    items.splice(index, 1);
  }
  return selectedItems;
}

/**
 * Adds two numbers together
 */
function add(a, b) {
  return a + b;
}


// ----------------- THE TIMER -----------------

// don't waste your brain power trying to understand how these functions work.
// just use them

/*
 * Makes the timer start ticking.
 * On each tick, updates the .secondsRemaining property of the model and re-renders.
 * Stops when model.secondsRemaining reaches 0.
 */
function startTimer() {
  function tick() {
    return setTimeout(() => {
      model.secondsRemaining = Math.max(0, model.secondsRemaining - 1);
      render();
      const stillTimeLeft = model.gameHasStarted && model.secondsRemaining > 0;
      if (stillTimeLeft) {
        model.timer = tick();
      }
    }, 1000);
  }
  return tick();
}

/*
 * Makes the timer stop ticking.
 */
function stopTimer() {
  clearTimeout(model.timer);
}
