const mongoose = require('mongoose');


// Defineix l'esquema per User
const ActionSchema = new mongoose.Schema({
  gameUUID: String,
  playerUUID: String,
  type: String,
  date:String,
  data:String
});

// Compila i exporta el model User
const Action = mongoose.model('Actions', ActionSchema);

module.exports = Action;
