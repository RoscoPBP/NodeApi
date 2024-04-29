const mongoose = require('mongoose');

const PlayerSchema = new mongoose.Schema({
    name: String,
    uuid: String,
    score: Number
});

const WordSchema = new mongoose.Schema({
    word: String,
    wordUUID: String
});

const GameSchema = new mongoose.Schema({
    type: String,
    startDate: String,
    endDate: String,
    dictionaryCode: String,
    players: [PlayerSchema],
    letters: [String],
    words: [WordSchema]
});

// Compile and export the Game model
const Game = mongoose.model('Game', GameSchema);

module.exports = Game;