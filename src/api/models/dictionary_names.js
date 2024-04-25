const mongoose = require('mongoose');

const DictionaryNameSchema = new mongoose.Schema({
    code: String,
    name: String,
});

// Compila i exporta el model User
const DictNames = mongoose.model('Dictionary_names', DictionaryNameSchema);

module.exports = DictNames;