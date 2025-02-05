const WordleSolver = require("./wordleSolver");

const solver = new WordleSolver();

// Example scenario:
// Let's say we guessed "STARE" and got:
// - 'S' was grey (not in word)
// - 'T' was grey
// - 'A' was yellow (in word but wrong position)
// - 'R' was grey
// - 'E' was green (correct position)

const greenLetters = {
  4: "e", // 'E' is in position 4 (0-based index)
};

const yellowLetters = {
  2: ["a"], // 'A' was in position 2 but that's wrong
};

const greyLetters = ["s", "t", "r"];

// Find possible words
const possibleWords = solver.findPossibleWords(
  greenLetters,
  yellowLetters,
  greyLetters
);
console.log("Possible words:", possibleWords);

// Get a suggestion for the next guess
const usedLetters = ["s", "t", "a", "r", "e"];
const suggestion = solver.suggestGuess(possibleWords, usedLetters);
console.log("Suggested next guess:", suggestion);
