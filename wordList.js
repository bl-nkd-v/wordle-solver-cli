const fs = require("fs");
const path = require("path");

const wordListPath = path.join(
  __dirname,
  "node_modules",
  "word-list",
  "words.txt"
);
const allWords = fs.readFileSync(wordListPath, "utf8").split("\n");

const wordList = allWords
  .filter((word) => {
    return word.length === 5 && /^[a-zA-Z]+$/.test(word);
  })
  .map((word) => word.toLowerCase());

wordList.sort();

console.log(`Loaded ${wordList.length} five-letter words`);

module.exports = wordList;
