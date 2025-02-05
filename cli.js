const readline = require("readline");
const WordleSolver = require("./wordleSolver");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

class WordleCLI {
  constructor() {
    this.solver = new WordleSolver();
    this.greenLetters = {};
    this.yellowLetters = {};
    this.greyLetters = [];
    this.usedLetters = new Set();
  }

  async start() {
    console.log("\nWelcome to Wordle Solver!");
    console.log("------------------------");
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
    const possibleWords = this.solver.findPossibleWords(
      this.greenLetters,
      this.yellowLetters,
      this.greyLetters
    );

    console.log("\nPossible words remaining:", possibleWords.length);
    if (possibleWords.length <= 10) {
      console.log("All possible words:", possibleWords.join(", "));
    }

    // Get suggestion
    const suggestion = this.solver.suggestGuess(
      possibleWords,
      Array.from(this.usedLetters)
    );
    console.log("\nSuggested guess:", suggestion || "No possible words remain");

    if (possibleWords.length === 0) {
      console.log(
        "\nNo words match the current criteria. Please check your inputs."
      );
      await this.askToContinue();
      return;
    }

    if (possibleWords.length === 1) {
      console.log("\nCongratulations! The word must be:", possibleWords[0]);
      await this.askToContinue();
      return;
    }

    // Ask for the actual guess used
    const actualGuess = await this.question(
      "\nEnter the word you guessed (or 'q' to quit): "
    );

    if (actualGuess.toLowerCase() === "q") {
      rl.close();
      return;
    }

    if (actualGuess.length !== 5) {
      console.log("\nError: Please enter a 5-letter word");
      await this.getNextGuess();
      return;
    }

    actualGuess
      .toLowerCase()
      .split("")
      .forEach((letter) => this.usedLetters.add(letter));

    console.log(
      `\nEnter feedback for your guess "${actualGuess.toUpperCase()}":`
    );
    await this.getFeedback(actualGuess.toLowerCase());
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
    console.log("\nEnter feedback using the following format:");
    console.log("For each letter, enter: position,color");
    console.log("Colors: g (green), y (yellow), x (grey)");
    console.log('Example: "1,g 3,y 5,x" means:');
    console.log("- Position 1 is green");
    console.log("- Position 3 is yellow");
    console.log("- Position 5 is grey");

    const feedback = await this.question('Enter feedback (or "q" to quit): ');

    if (feedback.toLowerCase() === "q") {
      rl.close();
      return;
    }

    try {
      this.processFeedback(feedback, guessedWord);
      await this.getNextGuess();
    } catch (error) {
      console.log("\nError:", error.message);
      await this.getFeedback(guessedWord);
    }
  }

  processFeedback(feedback, guessedWord) {
    const feedbackParts = feedback.trim().split(" ");

    for (const part of feedbackParts) {
      const [posStr, color] = part.split(",");
      const pos = parseInt(posStr) - 1;

      if (isNaN(pos) || pos < 0 || pos > 4) {
        throw new Error("Position must be between 1 and 5");
      }

      if (!["g", "y", "x"].includes(color)) {
        throw new Error("Color must be g, y, or x");
      }

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
    }
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
      await this.getNextGuess();
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
