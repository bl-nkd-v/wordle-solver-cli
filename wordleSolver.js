const wordList = require("./wordList");

class WordleSolver {
  constructor() {
    this.weight = {
      uniqueLetters: 10,
      letterFrequency: 1,
    };
    this.wordList = wordList;
  }

  /**
   * Find possible words based on the feedback from previous guesses
   * @param {Object} greenLetters - Object with index positions (0-4) as keys and letters as values
   * @param {Object} yellowLetters - Object with index positions (0-4) as keys and arrays of letters as values
   * @param {Array} greyLetters - Array of letters that are not in the word
   * @returns {Array} - List of possible words
   */
  findPossibleWords(greenLetters = {}, yellowLetters = {}, greyLetters = []) {
    return this.wordList.filter((word) => {
      for (const [index, letter] of Object.entries(greenLetters)) {
        if (word[parseInt(index)] !== letter) {
          return false;
        }
      }

      for (const [index, letters] of Object.entries(yellowLetters)) {
        const idx = parseInt(index);
        if (letters.includes(word[idx])) {
          return false;
        }
        for (const letter of letters) {
          if (!word.includes(letter)) {
            return false;
          }
        }
      }

      for (const letter of greyLetters) {
        if (word.includes(letter)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Suggest the next best guess based on letter frequency and unused letters
   * @param {Array} possibleWords - List of possible words
   * @param {Array} usedLetters - Letters that have been guessed already
   * @returns {String} - Suggested word to guess
   */
  suggestGuess(possibleWords, usedLetters = []) {
    if (possibleWords.length === 0) {
      return null;
    }

    const letterFrequency = {};
    for (const word of possibleWords) {
      for (const letter of new Set(word.split(""))) {
        letterFrequency[letter] = (letterFrequency[letter] || 0) + 1;
      }
    }

    const wordScores = possibleWords.map((word) => {
      const uniqueLetters = new Set(word.split(""));
      let score = 0;

      const unusedUniqueLetters = [...uniqueLetters].filter(
        (letter) => !usedLetters.includes(letter)
      );
      score += unusedUniqueLetters.length * this.weight.uniqueLetters;

      for (const letter of uniqueLetters) {
        score += letterFrequency[letter] * this.weight.letterFrequency;
      }

      return { word, score };
    });

    wordScores.sort((a, b) => b.score - a.score);
    return wordScores[0].word;
  }
}

module.exports = WordleSolver;
