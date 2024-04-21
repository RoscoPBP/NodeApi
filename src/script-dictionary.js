const fs = require('fs');
const readline = require('readline');
const dbConfig = require('./config/db');
const mongoose = require('mongoose');

const dictionaryPath = '../data/DISC2/DISC2-LP.txt';

const language = "CA";

// Define the Mongoose schema for posts
const WordSchema = new mongoose.Schema({
  word: String,
  position: Number,
  language: String,
  timesUsed: Number,
});

// Compile model from schema
const Word = mongoose.model('dictionaryCA', WordSchema);

function processWord(word) {
  console.log("word processing..", word.word);
  const processed = {
    word: String(word.word),
    position: Number(word.position),
    language: String(word.language),
    timesUsed: Number(word.timesUsed)
  };

  return processed;
}

async function readTXT(filePath, language) {
    //var wordList = [];

    fs.access(filePath, fs.constants.F_OK, (err) => {
        let currentLine = 1;
        if (err) {
	    console.log(err);
            console.error('File does not exist or cannot be accessed.');
            return;
        }
        
        console.log('File exists.');
    
        const fileStream = fs.createReadStream(dictionaryPath);
    
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });
    
        // Read each line, create object and push it into the array
        rl.on('line', async (line) => {
            //console.log('Line:', line, currentLine);
            const objWord = {word:line, position:currentLine, language:language, timesUsed:0};
            await insertWord(processWord(objWord));
            currentLine += 1;
            console.log(objWord)
        });
    
        // Close the readline interface when done
        rl.on('close', () => {
            console.log('File reading completed.');
        });

        
    });

    //return wordList;
}


async function insertWord(word) {
  
  //await Word.insertMany(words);
  await Word.create(word)
  
}

async function main() {
    console.log("Script to introduce txt data to mongo Dictionary collection");
    
    try {
        console.log("Before connecting to MongoDB");
        await mongoose.connect(dbConfig.MONGODB_URI);
        await readTXT(dictionaryPath, language);
        
        console.log('Words inserted into the MongoDB database.');
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error processing or inserting into MongoDB:', error);
    }
}

main();
