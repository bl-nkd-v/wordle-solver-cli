const wordLists = require("./wordList");

class WordleSolver {
  constructor(wordLength) {
    this.weight = {
      uniqueLetters: 10,
      letterFrequency: 1,
    };
    this.wordLength = wordLength;
    this.wordList = wordLists.get(wordLength) || [];
    if (this.wordList.length === 0) {
      throw new Error(`No ${wordLength}-letter words found in dictionary`);
    }
  }

  /**
   * Find possible words based on the feedback from previous guesses
   * @param {Object} greenLetters - Object with index positions (0-based) as keys and letters as values
   * @param {Object} yellowLetters - Object with index positions (0-based) as keys and arrays of letters as values
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
   * Suggest the best guesses based on letter frequency and unused letters
   * @param {Array} possibleWords - List of possible words
   * @param {Array} usedLetters - Letters that have been guessed already
   * @param {number} numSuggestions - Number of suggestions to return
   * @returns {Array} - Array of suggested words with their scores
   */
  suggestGuesses(possibleWords, usedLetters = [], numSuggestions = 5) {
    if (possibleWords.length === 0) {
      return [];
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
    return wordScores.slice(0, numSuggestions);
  }

  /**
   * Get available word lengths in the dictionary
   * @returns {Array} - Array of available word lengths
   */
  static getAvailableWordLengths() {
    return Array.from(wordLists.keys()).sort((a, b) => a - b);
  }
}

module.exports = WordleSolver;
