const mongoose = require('mongoose');

// Defineix l'esquema per User
const UserSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true // Assegura que cada usuari te un ID únic
  },
  displayName: String,
  reputation: Number,
  creationDate: Date,
  location: String,
  aboutMe: String,
});

// Defineix l'esquema per User
const roscodromUserSchema = new mongoose.Schema({
  uuid: String,
  name: String,
  email: String,
  phone: String,
  api_key: String
});

// Compila i exporta el model User
const User = mongoose.model('Users', roscodromUserSchema);

module.exports = User;
