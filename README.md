# Wordle Solver

A smart command-line tool that helps you solve Wordle and Wordle-like word games. This solver uses letter frequency analysis and information theory to suggest optimal guesses, helping you solve the puzzle in fewer attempts.

## Features

- 🎯 Works with any 5-letter word game (Wordle, derivatives, and variants)
- 📚 Comprehensive dictionary with over 12,500 valid 5-letter words
- 🧠 Smart guess suggestions based on:
  - Letter frequency in remaining possible words
  - Unused letters to maximize information gain
  - Position-based feedback from previous guesses
- 💻 Interactive CLI interface
- 🎮 Flexible gameplay - use suggested words or your own guesses

## Installation

1. Clone this repository:

```bash
git clone https://github.com/yourusername/wordle-solver.git
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

1. The solver suggests a word to guess (but you're free to use any 5-letter word)
2. Enter the word you actually guessed
3. Provide feedback using the following format:
   - For each letter, enter: `position,color`
   - Position: 1-5 (left to right)
   - Colors:
     - `g` = green (correct letter, correct position)
     - `y` = yellow (correct letter, wrong position)
     - `x` = grey (letter not in word)
   - Separate multiple letters with spaces

Example feedback:

- If you guessed "STARE" and got:
  - S: grey
  - T: grey
  - A: yellow
  - R: grey
  - E: green
- You would enter: `1,x 2,x 3,y 4,x 5,g`

### Example Session

```
Welcome to Wordle Solver!
------------------------

Current state:
Green letters (correct position): none
Yellow letters (wrong position): none
Grey letters (not in word): none

Possible words remaining: 12578

Suggested guess: aeros

Enter the word you guessed (or 'q' to quit): stare

Enter feedback for your guess "STARE":
Enter feedback using the following format:
For each letter, enter: position,color
Colors: g (green), y (yellow), x (grey)
Example: "1,g 3,y 5,x" means:
- Position 1 is green
- Position 3 is yellow
- Position 5 is grey

Enter feedback (or "q" to quit): 1,x 2,x 3,y 4,x 5,g

Current state:
Green letters (correct position): e at position 5
Yellow letters (wrong position): a not at position 3
Grey letters (not in word): s, t, r

Possible words remaining: 7

All possible words: above, alike, alive, alone, angle, apple, cable

Suggested guess: alike
...
```

### Commands

- Enter `q` at any prompt to quit the game
- When a game is finished, you can choose to start a new game or quit

## How the Solver Works

1. **Word List**: The solver uses a comprehensive list of 5-letter English words (over 12,500 words).

2. **Finding Possible Words**: After each guess, the solver filters the word list to find words that:

   - Have green letters in the correct positions
   - Include yellow letters (but not in the positions where they were yellow)
   - Don't contain any grey letters

3. **Suggesting Guesses**: The solver suggests words based on:
   - Number of unique, unused letters (weighted heavily to maximize information gain)
   - Frequency of letters in the remaining possible words
   - This strategy helps eliminate as many possibilities as quickly as possible

## Contributing

Feel free to open issues or submit pull requests with improvements. Some areas for potential enhancement:

- Add weights to words based on their frequency in English
- Create separate lists for valid guesses vs. possible solutions
- Add support for different word lengths
- Add a "hard mode" option
- Implement additional solving strategies

## License

MIT License - feel free to use this code in your own projects!
