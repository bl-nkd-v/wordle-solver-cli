const fs = require("fs");
const path = require("path");

const wordListPath = path.join(
  __dirname,
  "node_modules",
  "word-list",
  "words.txt"
);
const allWords = fs.readFileSync(wordListPath, "utf8").split("\n");

// Create a map of word lengths to word lists
const wordLists = new Map();

// Filter words by length and store them in the map
allWords.forEach((word) => {
  if (/^[a-zA-Z]+$/.test(word)) {
    // Only include words with letters
    const length = word.length;
    const lowerWord = word.toLowerCase();

    if (!wordLists.has(length)) {
      wordLists.set(length, new Set());
    }
    wordLists.get(length).add(lowerWord);
  }
});

// Convert Sets to sorted arrays
for (const [length, wordSet] of wordLists) {
  wordLists.set(length, Array.from(wordSet).sort());
}

// Log available word lengths and counts
console.log("\nAvailable word lengths and counts:");
for (const [length, words] of wordLists) {
  console.log(`${length}-letter words: ${words.length}`);
}

module.exports = wordLists;
