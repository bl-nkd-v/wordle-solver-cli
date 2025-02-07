const wordLists = require("./wordList");

class WordleSolver {
  constructor(wordLength) {
    this.weight = {
      uniqueLetters: 10,
      letterFrequency: 1,
      informationGain: 15, // New weight for information gathering
    };
    this.wordLength = wordLength;
    this.wordList = wordLists.get(wordLength) || [];
    // Keep a separate list of all words of this length for information guesses
    this.allWordList = [...this.wordList];
    if (this.wordList.length === 0) {
      throw new Error(`No ${wordLength}-letter words found in dictionary`);
    }

    // Precompute first guess scores
    this.firstGuessScores = null;
  }

  /**
   * Get initial guesses without heavy computation
   * @returns {Object} Initial guess suggestions
   */
  getInitialGuesses() {
    // These are pre-selected good starting words for 5-letter Wordle
    if (this.wordLength === 5) {
      return {
        solutionGuesses: [
          { word: "stare", score: 100, type: "solution" },
          { word: "crane", score: 98, type: "solution" },
          { word: "trace", score: 98, type: "solution" },
          { word: "slate", score: 97, type: "solution" },
          { word: "crate", score: 97, type: "solution" },
        ],
        informationGuesses: [
          { word: "stare", score: 100, type: "information" },
          { word: "crane", score: 98, type: "information" },
          { word: "trace", score: 98, type: "information" },
          { word: "slate", score: 97, type: "information" },
          { word: "crate", score: 97, type: "information" },
        ],
      };
    }

    // For other lengths, do a quick frequency-based calculation
    const letterFreq = this.calculateLetterFrequency(this.wordList);
    const quickScores = this.wordList
      .map((word) => {
        const uniqueLetters = new Set(word.split(""));
        let score = uniqueLetters.size * this.weight.uniqueLetters;
        for (const letter of uniqueLetters) {
          score += letterFreq[letter].total * this.weight.letterFrequency;
        }
        return { word, score, type: "solution" };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return {
      solutionGuesses: quickScores,
      informationGuesses: quickScores,
    };
  }

  /**
   * Find possible words based on the feedback from previous guesses
   * @param {Object} greenLetters - Object with index positions (0-based) as keys and letters as values
   * @param {Object} yellowLetters - Object with index positions (0-based) as keys and arrays of letters as values
   * @param {Array} greyLetters - Array of letters that are not in the word
   * @returns {Array} - List of possible words
   */
  findPossibleWords(greenLetters = {}, yellowLetters = {}, greyLetters = []) {
    // Remove duplicates from grey letters
    const uniqueGreyLetters = [...new Set(greyLetters)];

    // Get all confirmed letters (green + yellow)
    const confirmedLetters = new Set();
    Object.values(greenLetters).forEach((letter) =>
      confirmedLetters.add(letter)
    );
    Object.values(yellowLetters).forEach((letters) =>
      letters.forEach((letter) => confirmedLetters.add(letter))
    );

    // Only consider a letter as truly grey if it's not confirmed in another position
    const trueGreyLetters = uniqueGreyLetters.filter(
      (letter) => !confirmedLetters.has(letter)
    );

    return this.wordList.filter((word) => {
      // Check green letters (must be in exact positions)
      for (const [index, letter] of Object.entries(greenLetters)) {
        if (word[parseInt(index)] !== letter) {
          return false;
        }
      }

      // Check yellow letters
      for (const [index, letters] of Object.entries(yellowLetters)) {
        const idx = parseInt(index);
        // Letter shouldn't be in this position
        if (letters.includes(word[idx])) {
          return false;
        }
        // But must be somewhere in the word
        for (const letter of letters) {
          if (!word.includes(letter)) {
            return false;
          }
        }
      }

      // Check grey letters (only if they're not confirmed elsewhere)
      for (const letter of trueGreyLetters) {
        if (word.includes(letter)) {
          return false;
        }
      }

      // For letters that appear as both yellow/green AND grey,
      // check that the word doesn't have MORE occurrences than confirmed
      const letterCounts = new Map();
      // Count confirmed occurrences (green + yellow)
      Object.values(greenLetters).forEach((letter) => {
        letterCounts.set(letter, (letterCounts.get(letter) || 0) + 1);
      });
      Object.values(yellowLetters).forEach((letters) => {
        letters.forEach((letter) => {
          letterCounts.set(letter, (letterCounts.get(letter) || 0) + 1);
        });
      });

      // Check if word has more occurrences than confirmed for any letter
      // that also appears in grey list
      for (const letter of uniqueGreyLetters) {
        if (confirmedLetters.has(letter)) {
          const confirmedCount = letterCounts.get(letter) || 0;
          const wordCount = word.split("").filter((l) => l === letter).length;
          if (wordCount > confirmedCount) {
            return false;
          }
        }
      }

      return true;
    });
  }

  /**
   * Calculate letter frequency in possible words
   * @param {Array} words - List of words to analyze
   * @param {Object} positionWeights - Optional weights for each position (0-4)
   * @returns {Object} - Map of letters to their frequency scores
   */
  calculateLetterFrequency(words, positionWeights = null) {
    const letterFreq = {};

    words.forEach((word) => {
      const uniqueLetters = new Set(word.split(""));
      uniqueLetters.forEach((letter) => {
        if (!letterFreq[letter]) {
          letterFreq[letter] = {
            total: 0,
            positions: Array(this.wordLength).fill(0),
          };
        }
        letterFreq[letter].total++;

        // Track position-specific frequencies
        for (let i = 0; i < word.length; i++) {
          if (word[i] === letter) {
            letterFreq[letter].positions[i]++;
          }
        }
      });
    });

    // Apply position weights if provided
    if (positionWeights) {
      Object.values(letterFreq).forEach((freq) => {
        freq.weightedTotal = freq.positions.reduce(
          (sum, pos, idx) => sum + pos * (positionWeights[idx] || 1),
          0
        );
      });
    }

    return letterFreq;
  }

  /**
   * Suggest the best guesses based on letter frequency and unused letters
   * @param {Array} possibleWords - List of possible words
   * @param {Array} usedLetters - Letters that have been guessed already
   * @param {number} numSuggestions - Number of suggestions to return
   * @returns {Object} - Object containing solution guesses and information guesses
   */
  suggestGuesses(possibleWords, usedLetters = [], numSuggestions = 5) {
    // For the very first guess, return pre-computed suggestions
    if (usedLetters.length === 0) {
      return this.getInitialGuesses();
    }

    if (possibleWords.length === 0) {
      return { solutionGuesses: [], informationGuesses: [] };
    }

    // Calculate letter frequency in possible solutions
    const solutionLetterFreq = this.calculateLetterFrequency(possibleWords);

    // Score solution guesses
    const solutionScores = this.scoreWords(
      possibleWords,
      usedLetters,
      solutionLetterFreq
    );

    // Generate information guesses if we have enough possible words
    let informationScores = [];
    if (possibleWords.length >= 2) {
      // Create weights for unknown positions (0 for green positions)
      const positionWeights = Array(this.wordLength).fill(1);
      Object.keys(this.getGreenPositions(possibleWords)).forEach((pos) => {
        positionWeights[parseInt(pos)] = 0;
      });

      // Calculate weighted letter frequency for information guesses
      const infoLetterFreq = this.calculateLetterFrequency(
        possibleWords,
        positionWeights
      );

      // Score information guesses
      const candidateWords = this.selectInformationGuessCandidates(
        possibleWords,
        usedLetters
      );
      informationScores = this.scoreInformationWords(
        candidateWords,
        usedLetters,
        infoLetterFreq,
        possibleWords,
        positionWeights,
        false
      );
    }

    return {
      solutionGuesses: solutionScores.slice(0, numSuggestions),
      informationGuesses: informationScores.slice(0, numSuggestions),
    };
  }

  /**
   * Score words based on their potential as solution guesses
   */
  scoreWords(words, usedLetters, letterFrequency) {
    const wordScores = words.map((word) => {
      const uniqueLetters = new Set(word.split(""));
      let score = 0;

      const unusedUniqueLetters = [...uniqueLetters].filter(
        (letter) => !usedLetters.includes(letter)
      );
      score += unusedUniqueLetters.length * this.weight.uniqueLetters;

      for (const letter of uniqueLetters) {
        score += letterFrequency[letter].total * this.weight.letterFrequency;
      }

      return { word, score, type: "solution" };
    });

    wordScores.sort((a, b) => b.score - a.score);
    return wordScores;
  }

  /**
   * Score words based on their potential as information-gathering guesses
   */
  scoreInformationWords(
    words,
    usedLetters,
    letterFrequency,
    possibleWords,
    positionWeights,
    isFirstGuess = false
  ) {
    // Get all known letters (both green and yellow)
    const knownLetters = new Set([
      ...this.getGreenLetters(possibleWords),
      ...this.getYellowLetters(possibleWords),
    ]);

    const wordScores = words.map((word) => {
      const uniqueLetters = new Set(word.split(""));
      let score = 0;

      // For first guess, focus purely on partition score
      if (isFirstGuess) {
        score =
          this.calculatePartitionScore(word, possibleWords) *
          this.weight.informationGain;
        return { word, score, type: "information" };
      }

      // Count letters that we haven't used yet and aren't known
      const discoveryLetters = [...uniqueLetters].filter(
        (letter) => !usedLetters.includes(letter) && !knownLetters.has(letter)
      );

      // Skip words that don't introduce any new letters (unless it's first guess)
      if (discoveryLetters.length === 0 && !isFirstGuess) {
        return { word, score: 0, type: "information" };
      }

      // Calculate how well this word could partition the remaining possibilities
      const partitionScore = this.calculatePartitionScore(word, possibleWords);
      score += partitionScore * this.weight.informationGain;

      // Add small bonus for common letters in the possible words
      // but only for letters we haven't tried yet
      for (const letter of discoveryLetters) {
        if (letterFrequency[letter]) {
          score +=
            letterFrequency[letter].weightedTotal *
            this.weight.letterFrequency *
            0.5;
        }
      }

      // Penalize words that use any known letters
      const knownLettersUsed = [...uniqueLetters].filter((letter) =>
        knownLetters.has(letter)
      ).length;
      if (knownLettersUsed > 0) {
        score *= Math.pow(0.3, knownLettersUsed);
      }

      // Additional penalty for using letters in known positions
      const greenPositions = this.getGreenPositions(possibleWords);
      for (const [pos, letter] of Object.entries(greenPositions)) {
        if (word[pos] === letter) {
          score *= 0.1;
        }
      }

      return { word, score, type: "information" };
    });

    // Filter out words that don't provide enough new information
    const filteredScores = wordScores
      .filter((score) => score.score > 0)
      .sort((a, b) => b.score - a.score);

    return filteredScores;
  }

  /**
   * Calculate how well a guess would partition the remaining possibilities
   * Returns a score based on how evenly it splits the possible solutions
   * into different feedback patterns
   */
  calculatePartitionScore(guess, possibleWords) {
    const patterns = new Map(); // Map of feedback pattern -> count

    // For each possible solution, calculate what feedback we'd get if we guessed this word
    for (const solution of possibleWords) {
      const feedback = this.simulateFeedback(guess, solution);
      patterns.set(feedback, (patterns.get(feedback) || 0) + 1);
    }

    // Calculate entropy-based score
    // Perfect partition would split possibilities into equal groups
    const totalWords = possibleWords.length;
    let score = 0;

    for (const count of patterns.values()) {
      const probability = count / totalWords;
      // Use information theory: -p * log2(p) for each partition
      score -= probability * Math.log2(probability);
    }

    return score;
  }

  /**
   * Simulate what feedback we'd get if we guessed 'guess' and the answer was 'solution'
   * Returns a string representing the feedback pattern (e.g., "GYYXX")
   */
  simulateFeedback(guess, solution) {
    const feedback = Array(this.wordLength).fill("X");
    const solutionChars = solution.split("");
    const guessChars = guess.split("");

    // First pass: Find green matches
    for (let i = 0; i < this.wordLength; i++) {
      if (guessChars[i] === solutionChars[i]) {
        feedback[i] = "G";
        solutionChars[i] = null; // Mark as used
        guessChars[i] = null;
      }
    }

    // Second pass: Find yellow matches
    for (let i = 0; i < this.wordLength; i++) {
      if (guessChars[i] === null) continue; // Skip green matches

      const solutionIdx = solutionChars.indexOf(guessChars[i]);
      if (solutionIdx !== -1) {
        feedback[i] = "Y";
        solutionChars[solutionIdx] = null; // Mark as used
      }
    }

    return feedback.join("");
  }

  /**
   * Get all green letters from possible words
   */
  getGreenLetters(possibleWords) {
    const greenLetters = new Set();
    const greenPositions = this.getGreenPositions(possibleWords);
    Object.values(greenPositions).forEach((letter) => greenLetters.add(letter));
    return greenLetters;
  }

  /**
   * Get all yellow letters from possible words
   */
  getYellowLetters(possibleWords) {
    const yellowLetters = new Set();
    if (possibleWords.length === 0) return yellowLetters;

    // Find letters that appear in some words but not in the same position
    for (let pos = 0; pos < this.wordLength; pos++) {
      const letters = new Set(possibleWords.map((word) => word[pos]));
      letters.forEach((letter) => {
        if (!possibleWords.every((word) => word[pos] === letter)) {
          // If letter appears in some words at this position but not all,
          // it must be a yellow letter
          yellowLetters.add(letter);
        }
      });
    }

    return yellowLetters;
  }

  /**
   * Find positions where all possible words have the same letter
   */
  getGreenPositions(possibleWords) {
    if (possibleWords.length === 0) return {};

    const greenPositions = {};
    for (let pos = 0; pos < this.wordLength; pos++) {
      const letter = possibleWords[0][pos];
      if (possibleWords.every((word) => word[pos] === letter)) {
        greenPositions[pos] = letter;
      }
    }
    return greenPositions;
  }

  /**
   * Select a random sample of words
   */
  sampleWords(words, sampleSize) {
    const sample = new Set();
    const wordArray = Array.from(words);

    while (sample.size < sampleSize && sample.size < wordArray.length) {
      const index = Math.floor(Math.random() * wordArray.length);
      sample.add(wordArray[index]);
    }

    return Array.from(sample);
  }

  /**
   * Select candidate words for information gathering
   */
  selectInformationGuessCandidates(possibleWords, usedLetters) {
    // If we have few possible words, evaluate all words
    if (possibleWords.length < 100) {
      return this.allWordList;
    }

    // Otherwise, use a combination of:
    // 1. All possible solutions (they might be good information gatherers)
    // 2. A sample of other words that have unused common letters
    const candidates = new Set(possibleWords);

    // Add words that have many unused letters
    const commonLetters = this.getCommonLetters(possibleWords);
    for (const word of this.allWordList) {
      const wordLetters = new Set(word.split(""));
      const unusedCommonLetters = [...wordLetters].filter(
        (letter) => !usedLetters.includes(letter) && commonLetters.has(letter)
      );
      if (unusedCommonLetters.length >= 3) {
        candidates.add(word);
      }
    }

    return Array.from(candidates);
  }

  /**
   * Get the most common letters in the possible words
   */
  getCommonLetters(words) {
    const letterFreq = {};
    for (const word of words) {
      for (const letter of new Set(word.split(""))) {
        letterFreq[letter] = (letterFreq[letter] || 0) + 1;
      }
    }

    // Get letters that appear in at least 20% of words
    const threshold = words.length * 0.2;
    const commonLetters = new Set();
    for (const [letter, freq] of Object.entries(letterFreq)) {
      if (freq >= threshold) {
        commonLetters.add(letter);
      }
    }

    return commonLetters;
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
