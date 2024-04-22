const mongoose = require('mongoose');

const WordSchema = new mongoose.Schema({
    word: String,
    position: Number,
    language: String,
    timesUsed: Number,
  });

// Compila i exporta el model User
const Img = mongoose.model('Images', ImageSchema);

function getWordSchema(code) {
    const Word = mongoose.model(code+'_Diccionario', WordSchema);
    return Word;
}

module.exports = getWordSchema;