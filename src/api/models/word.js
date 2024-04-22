const mongoose = require('mongoose');

const WordSchema = new mongoose.Schema({
    word: String,
    position: Number,
    language: String,
    timesUsed: Number,
  });

function getWordSchema(code) {
    const Word = mongoose.model(code+'_Diccionario', WordSchema);
    return Word;
}

module.exports = getWordSchema;