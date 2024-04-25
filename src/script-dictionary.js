const fs = require('fs');
const readline = require('readline');
const dbConfig = require('./config/db');
const mongoose = require('mongoose');

const dictionaryPath = '/root/NodeApi/data/DISC2/DISC2-LP.txt';

const language = "ES";

// Define the Mongoose schema for posts
const WordSchema = new mongoose.Schema({
  word: String,
  position: Number,
  language: String,
  timesUsed: Number,
});

// Compile model from schema
const Word = mongoose.model(language+'_Diccionario', WordSchema);

function processWord(word) {
  const processed = {
    word: String(word.word),
    position: Number(word.position),
    language: String(word.language),
    timesUsed: Number(word.timesUsed)
  };

  return processed;
}

async function readTXT(filePath, language) {
    let currentLine = 1;
    let dummyList = []
    try {
        const fileStream = fs.createReadStream(filePath);
    
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });
    
        // Read each line, create object and push it into the array
        rl.on('line', (line) => {
            const objWord = {word:line, position:currentLine, language:language, timesUsed:0};
            currentLine += 1;

            dummyList.push(processWord(objWord));
            if (dummyList.length > 3999) {
                insertWords(dummyList);
                dummyList = [];
            }
            
        });
    
        // Close the readline interface when done
        rl.on('close', async () => {
            if (dummyList.length > 0) {
                insertWords(dummyList);
                dummyList = [];
            }
            console.log('File reading completed.');
            
        });
    } catch (error) {
        console.error('Error reading TXT file:', error);
    }
}


async function insertWords(wordList) {
    await mongoose.connect(dbConfig.MONGODB_URI);
    await Word.insertMany(wordList);
    console.log("insertado array...")
    
  }

async function main() {
    console.log("Script to introduce txt data to mongo Dictionary collection");
    await readTXT(dictionaryPath, language);
    //console.log('Words inserted into the MongoDB database.');
    
}

main();
