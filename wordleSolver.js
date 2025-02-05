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

    // Generate information guesses if we have enough possible words to make it worthwhile
    let informationScores = [];
    if (possibleWords.length >= 2) {
      // Changed from > 2 to >= 2
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

      // For the first guess (when no letters are used), focus purely on partition score
      const isFirstGuess = usedLetters.length === 0;

      // Score all words as information guesses
      informationScores = this.scoreInformationWords(
        this.allWordList,
        usedLetters,
        infoLetterFreq,
        possibleWords,
        positionWeights,
        isFirstGuess
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
   * Get available word lengths in the dictionary
   * @returns {Array} - Array of available word lengths
   */
  static getAvailableWordLengths() {
    return Array.from(wordLists.keys()).sort((a, b) => a - b);
  }
}

module.exports = WordleSolver;
