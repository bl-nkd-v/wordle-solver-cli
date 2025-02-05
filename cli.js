const readline = require("readline");
const WordleSolver = require("./wordleSolver");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

class WordleCLI {
  constructor() {
    this.solver = null;
    this.wordLength = null;
    this.greenLetters = {};
    this.yellowLetters = {};
    this.greyLetters = [];
    this.usedLetters = new Set();
    this.currentPossibleWords = [];
  }

  async start() {
    console.log("\nWelcome to Wordle Solver!");
    console.log("------------------------");

    // Get available word lengths
    const availableLengths = WordleSolver.getAvailableWordLengths();
    console.log("\nAvailable word lengths:", availableLengths.join(", "));

    // Ask for word length
    while (!this.solver) {
      const lengthInput = await this.question(
        "Enter the length of words to solve (e.g., 4 or 5): "
      );
      const length = parseInt(lengthInput);

      if (isNaN(length) || !availableLengths.includes(length)) {
        console.log(
          `Invalid length. Please choose from: ${availableLengths.join(", ")}`
        );
        continue;
      }

      try {
        this.solver = new WordleSolver(length);
        this.wordLength = length;
        console.log(`\nInitialized solver for ${length}-letter words`);
      } catch (error) {
        console.log(`Error: ${error.message}`);
      }
    }

    await this.getNextGuess();
  }

  async getNextGuess() {
    // Show current state
    console.log("\nCurrent state:");
    console.log("Green letters (correct position):", this.formatGreenLetters());
    console.log("Yellow letters (wrong position):", this.formatYellowLetters());
    console.log(
      "Grey letters (not in word):",
      this.greyLetters.join(", ") || "none"
    );

    // Get possible words based on current state
    this.currentPossibleWords = this.solver.findPossibleWords(
      this.greenLetters,
      this.yellowLetters,
      this.greyLetters
    );

    console.log(
      "\nPossible words remaining:",
      this.currentPossibleWords.length
    );
    if (this.currentPossibleWords.length <= 10) {
      console.log("All possible words:", this.currentPossibleWords.join(", "));
    }

    // Get suggestions
    const suggestions = this.solver.suggestGuesses(
      this.currentPossibleWords,
      Array.from(this.usedLetters)
    );

    if (suggestions.length === 0) {
      console.log("\nNo possible words remain");
    } else {
      console.log("\nTop suggested guesses:");
      suggestions.forEach((suggestion, index) => {
        console.log(
          `${index + 1}. ${suggestion.word} (score: ${suggestion.score.toFixed(
            1
          )})`
        );
      });
    }

    if (this.currentPossibleWords.length === 0) {
      console.log(
        "\nNo words match the current criteria. Please check your inputs."
      );
      await this.askToContinue();
      return;
    }

    if (this.currentPossibleWords.length === 1) {
      console.log(
        "\nCongratulations! The word must be:",
        this.currentPossibleWords[0]
      );
      await this.askToContinue();
      return;
    }

    // Ask for the actual guess used
    const input = await this.question(
      '\nEnter your guess (or "q" to quit, "l" to list all remaining words): '
    );

    const command = input.toLowerCase();
    if (command === "q") {
      rl.close();
      return;
    }

    if (command === "l") {
      console.log("\nAll remaining possible words:");
      // Print words in columns for better readability
      const columns = 5;
      for (let i = 0; i < this.currentPossibleWords.length; i += columns) {
        const row = this.currentPossibleWords
          .slice(i, i + columns)
          .map((word) => word.padEnd(12)) // Pad each word to align columns
          .join("");
        console.log(row);
      }
      await this.getNextGuess();
      return;
    }

    if (input.length !== this.wordLength) {
      console.log(`\nError: Please enter a ${this.wordLength}-letter word`);
      await this.getNextGuess();
      return;
    }

    const actualGuess = input.toLowerCase();
    actualGuess.split("").forEach((letter) => this.usedLetters.add(letter));

    console.log(
      `\nEnter feedback for your guess "${actualGuess.toUpperCase()}":`
    );
    await this.getFeedback(actualGuess);
  }

  formatGreenLetters() {
    return (
      Object.entries(this.greenLetters)
        .map(([pos, letter]) => `${letter} at position ${parseInt(pos) + 1}`)
        .join(", ") || "none"
    );
  }

  formatYellowLetters() {
    return (
      Object.entries(this.yellowLetters)
        .map(
          ([pos, letters]) =>
            `${letters.join(",")} not at position ${parseInt(pos) + 1}`
        )
        .join(", ") || "none"
    );
  }

  async getFeedback(guessedWord) {
    console.log(
      `\nEnter feedback as a ${this.wordLength}-letter string where:`
    );
    console.log("g = green (correct letter, correct position)");
    console.log("y = yellow (correct letter, wrong position)");
    console.log("x = grey (letter not in word)");
    console.log(`Example: "${"x".repeat(this.wordLength - 1)}g" means:`);
    console.log(`- First ${this.wordLength - 1} letters are grey`);
    console.log("- Last letter is green");

    const feedback = await this.question('Enter feedback (or "q" to quit): ');

    if (feedback.toLowerCase() === "q") {
      rl.close();
      return;
    }

    try {
      this.processFeedback(feedback.toLowerCase(), guessedWord);
      await this.getNextGuess();
    } catch (error) {
      console.log("\nError:", error.message);
      await this.getFeedback(guessedWord);
    }
  }

  processFeedback(feedback, guessedWord) {
    if (feedback.length !== this.wordLength) {
      throw new Error(
        `Feedback must be exactly ${this.wordLength} letters long`
      );
    }

    if (!/^[gyx]+$/.test(feedback)) {
      throw new Error("Feedback can only contain the letters g, y, and x");
    }

    const colors = feedback.split("");
    colors.forEach((color, pos) => {
      const letter = guessedWord[pos];

      switch (color) {
        case "g":
          this.greenLetters[pos] = letter;
          break;
        case "y":
          if (!this.yellowLetters[pos]) {
            this.yellowLetters[pos] = [];
          }
          this.yellowLetters[pos].push(letter);
          break;
        case "x":
          this.greyLetters.push(letter);
          break;
      }
    });
  }

  async askToContinue() {
    const answer = await this.question(
      "\nWould you like to start a new game? (y/n): "
    );
    if (answer.toLowerCase() === "y") {
      this.greenLetters = {};
      this.yellowLetters = {};
      this.greyLetters = [];
      this.usedLetters.clear();
      this.currentPossibleWords = [];
      // Ask for word length again for the new game
      this.solver = null;
      await this.start();
    } else {
      rl.close();
    }
  }

  question(query) {
    return new Promise((resolve) => rl.question(query, resolve));
  }
}

// Start the CLI
const cli = new WordleCLI();
cli.start().catch(console.error);

// Handle cleanup
rl.on("close", () => {
  console.log("\nThanks for using Wordle Solver!");
  process.exit(0);
});
