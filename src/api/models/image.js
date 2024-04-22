const mongoose = require('mongoose');

const ImageSchema = new mongoose.Schema({
    userUUID: String,
    base64: String,
});

// Compila i exporta el model User
const Img = mongoose.model('Images', ImageSchema);

module.exports = Img;