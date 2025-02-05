# Wordle Solver

A smart command-line tool that helps you solve Wordle and Wordle-like word games. This solver uses letter frequency analysis and information theory to suggest optimal guesses, helping you solve the puzzle in fewer attempts.

## Features

- 🎯 Works with any word game (Wordle, derivatives, and variants)
- 📏 Supports multiple word lengths (4-letter, 5-letter, and more)
- 📚 Comprehensive dictionary with thousands of words
- 🧠 Smart guess suggestions based on:
  - Letter frequency in remaining possible words
  - Unused letters to maximize information gain
  - Position-based feedback from previous guesses
- 💻 Interactive CLI interface
- 🎮 Flexible gameplay - use suggested words or your own guesses
- 📋 Multiple guess suggestions with scoring
- 📝 View all possible remaining words at any time

## Installation

1. Clone this repository:

```bash
git clone https://github.com/bl-nkd-v/wordle-solver.git
cd wordle-solver
```

2. Install dependencies:

```bash
npm install
```

## Usage

Start the solver:

```bash
node cli.js
```

### How It Works

1. Choose the word length for your game (e.g., 4 for 4-letter words, 5 for 5-letter words)
2. The solver suggests multiple words to guess (but you're free to use any word)
3. Enter the word you actually guessed, or use special commands:
   - `l` to list all remaining possible words
   - `q` to quit the game
4. Provide feedback as a string of letters where:
   - `g` = green (correct letter, correct position)
   - `y` = yellow (correct letter, wrong position)
   - `x` = grey (letter not in word)

Example feedback for a 5-letter word:

- If you guessed "STARE" and got:
  - S: grey
  - T: grey
  - A: yellow
  - R: grey
  - E: green
- You would simply enter: `xxyxg`

Example feedback for a 4-letter word:

- If you guessed "PLAY" and got:
  - P: grey
  - L: yellow
  - A: green
  - Y: grey
- You would simply enter: `xyax`

### Example Session

```
Welcome to Wordle Solver!
------------------------

Available word lengths: 4, 5, 6, 7, 8

Enter the length of words to solve (e.g., 4 or 5): 5

Initialized solver for 5-letter words

Current state:
Green letters (correct position): none
Yellow letters (wrong position): none
Grey letters (not in word): none

Possible words remaining: 12578

Top suggested guesses:
1. aeros (score: 245.0)
2. soare (score: 245.0)
3. reais (score: 240.0)
4. raise (score: 240.0)
5. serai (score: 240.0)

Enter your guess (or "q" to quit, "l" to list all remaining words): stare

Enter feedback for your guess "STARE":
Enter feedback as a 5-letter string where:
g = green (correct letter, correct position)
y = yellow (correct letter, wrong position)
x = grey (letter not in word)
Example: "xxxxg" means:
- First four letters are grey
- Last letter is green

Enter feedback (or "q" to quit): xxyxg

Current state:
Green letters (correct position): e at position 5
Yellow letters (wrong position): a not at position 3
Grey letters (not in word): s, t, r

Possible words remaining: 7

All possible words: above, alike, alive, alone, angle, apple, cable

Top suggested guesses:
1. alike (score: 52.0)
2. alive (score: 52.0)
3. alone (score: 48.0)
4. angle (score: 45.0)
5. apple (score: 42.0)
...
```

### Commands

- Enter `l` at any prompt to see all remaining possible words
- Enter `q` at any prompt to quit the game
- When a game is finished, you can choose to start a new game (and select a new word length) or quit

### Understanding Guess Scores

The solver suggests multiple words and shows a score for each one. The score is calculated based on:

- Number of unused letters in the word (weighted heavily)
- Frequency of letters in the remaining possible words
- Higher scores indicate better guesses for narrowing down possibilities

## How the Solver Works

1. **Word List**: The solver maintains separate lists of words for each word length.

2. **Finding Possible Words**: After each guess, the solver filters the word list to find words that:

   - Have green letters in the correct positions
   - Include yellow letters (but not in the positions where they were yellow)
   - Don't contain any grey letters

3. **Suggesting Guesses**: The solver suggests multiple words based on:
   - Number of unique, unused letters (weighted heavily to maximize information gain)
   - Frequency of letters in the remaining possible words
   - This strategy helps eliminate as many possibilities as quickly as possible

## Contributing

Feel free to open issues or submit pull requests with improvements. Some areas for potential enhancement:

- Add weights to words based on their frequency in English
- Create separate lists for valid guesses vs. possible solutions
- Add a "hard mode" option
- Implement additional solving strategies
- Add support for custom dictionaries

## License

MIT License - feel free to use this code in your own projects!
