const User = require('./api/models/user');
const Game = require('./api/models/games');
const getWordSchema = require('./api/models/word');
const dbManager = require('./mongoManager');
const { v4: uuidv4 } = require('uuid');

class Joc {
    constructor(partidaDuracio, pausaDuracio, websocket, language) {
      this.partidaDuracio = partidaDuracio;
      this.pausaDuracio = pausaDuracio;
      this.properInici = Date.now() + this.pausaDuracio;
      this.enPartida = false;
      this.websocket = websocket;

      // socket id: data
      this.playersJugant = {};
      this.playersEspera = {};
      
      this.gameUUID = "";
      this.gameObject = {};
      this.iniciarCicle();
      
      // Await the asynchronous method call
      this.getWordAvgLenght(language).then(averageLength => {
        this.averageLenght = averageLength;
      });

      this.getWordAvgTimesUsed(language).then(timesUsed => {
        this.timesUsed = timesUsed;
    });
    }
  
    iniciarCicle() {
      setInterval(() => {
        if (this.enPartida) {
          this.properInici = Date.now() + this.pausaDuracio;
          this.gameObject.endDate = this.formatDate(new Date(Date.now()));
          console.log("FIN del game");
          // AQUI SE DEBERIA DE PROCESSAR Y GUARDAR EL OBJECTO EN MONGODB ANTES DE ELIMINARLO
          // SOLO SE GUARDA SI EL JUEGO TIENE AL MENOS 1 JUGADOR !!!
          console.log(JSON.stringify(this.gameObject));
          console.log(this.gameObject.players.length)

          if (this.gameObject.players.length > 0) {
            dbManager.insertGame(this.gameObject)
          }
          

          Object.keys(this.playersJugant).forEach(socketId => {
                const socket = this.websocket.sockets.sockets.get(socketId);
                if (socket) {
                    socket.disconnect();
                }
            });
        
          this.gameObject = {};
          this.enPartida = false;
        } else {

          this.properInici = Date.now() + this.partidaDuracio + this.pausaDuracio;
          this.enPartida = true;
          const letters = this.chooseLetters();
          console.log(letters);
          console.log("Empezando partida | enviando a jugadores");

          this.gameObject.players = [];

          this.gameUUID = uuidv4();
          this.gameObject.UUID = gameUUID;
          /*this.playersEspera.forEach(player => {
            const { socketId, userData } = player;
            this.gameObject.players.push(userData);
            this.websocket.to(socketId).emit('INICI_PARTIDA', {letters:letters})});*/
        
            Object.keys(this.playersEspera).forEach(socketId => {
                const socket = this.websocket.sockets.sockets.get(socketId);
                if (socket) {
                    this.websocket.to(socket).emit('INICI_PARTIDA', {letters:letters});
                    this.gameObject.players.push(this.playersEspera[socketId]);
                }
            });
            
          this.playersJugant = this.playersEspera;
          this.playersEspera = {};

          this.gameObject.startDate = this.formatDate(new Date());
          this.gameObject.type = "multiplayer";
          this.gameObject.dictionaryCode = 'CA';

          
          this.gameObject.words = [];
          this.gameObject.letters = letters;
          
        }
      }, this.partidaDuracio);
    }

    async getWordAvgLenght(language) {
        const WordSchema = getWordSchema(language);
    
        const averageLengthResult = await WordSchema.aggregate([
            {
                $group: {
                    _id: null,
                    totalLength: { $sum: { $strLenCP: "$word" } },
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    averageLength: { $divide: ["$totalLength", "$count"] }
                }
            }
        ]);
        const averageLength = averageLengthResult[0].averageLength;

        console.log("Average word length:", averageLength);

        const onlineAttribute = Math.round(averageLength * (0.7 + Math.random() * 0.6));

        console.log("Online attribute:", onlineAttribute);

        return onlineAttribute;
    }

    async getWordAvgTimesUsed(language) {
        const WordSchema = getWordSchema(language);
    
        const averageTimesUsedResult = await WordSchema.aggregate([
            {
                $group: {
                    _id: null,
                    totalTimesUsed: { $sum: "$timesUsed" },
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    averageTimesUsed: { $divide: ["$totalTimesUsed", "$count"] }
                }
            }
        ]);
    
        const averageTimesUsed = averageTimesUsedResult[0].averageTimesUsed;
    
        console.log("Average times used:", averageTimesUsed);
    
        const onlineAttribute = averageTimesUsed + 1;
    
        console.log("Online attribute based on times used:", onlineAttribute);
    
        return onlineAttribute;
    }

    chooseLetters() {
        console.log(this.averageLenght);
        const vocales = ['A', 'E', 'I', 'O', 'U'];
        const consonantesMuyUsadas = ['L', 'N', 'S', 'T', 'R'];
        const consonantesPocoUsadas = ['B', 'C', 'D', 'F', 'G', 'H', 'J', 'K', 'M', 'P', 'Q', 'V', 'W', 'X', 'Y', 'Z'];
        let chosenLetters = [];
        while (chosenLetters.length < 2) {
            let letter = this.getRandomLetter(vocales)
            if (letter != null) {
                chosenLetters.push(letter);
            }
        }

        while (chosenLetters.length < this.averageLenght) {
            let random = Math.random();
            let letter;
            if (random < 0.7) {
                letter = this.getRandomLetter(consonantesMuyUsadas);
            } else if (random < 0.9) {
                letter = this.getRandomLetter(consonantesPocoUsadas);
            } else {
                letter = this.getRandomLetter(vocales);
            }
            if (letter != null) {
                chosenLetters.push(letter);
            }

        }
    
        return chosenLetters;
    }
    
    getRandomLetter(letters) {
        if (letters.length === 0) {
            // If the array is empty, return null
            return null;
        }
        const index = Math.floor(Math.random() * letters.length);
        const letter = letters[index];
        letters.splice(index, 1);
        return letter;
    }
  
    consultaTempsRestant() {
      const tempsRestant = this.properInici - Date.now();
      return { tempsRestant, enPartida: this.enPartida };
    }

    async altaJugador(name, apiKey, sockerId) {
        const user = await User.findOne({ api_key: apiKey, name: name });

        if (user) {
            //this.playersEspera.push({socketId: sockerId, userData: {name: user.name, uuid:user.uuid, score:0}});
            this.playersEspera[sockerId] = {name: user.name, uuid:user.uuid, score:0};
            console.log("socketId alta = "+sockerId);
            console.log(sockerId);
            return { alta: true };
        } else {
            return { alta: false };
        }
    }

    calculateWordValue(word) {
        const rarityValues = {
            'A': 1, 'E': 1, 'I': 1, 'L': 1, 'N': 1, 'O': 1, 'R': 1, 'S': 1, 'T': 1, 'U': 1,
            'D': 2, 'G': 2,
            'B': 3, 'C': 3, 'M': 3, 'P': 3,
            'Ç': 4, 'F': 4, 'H': 4, 'V': 4, 'Y': 4,
            'K': 5,
            'J': 8, 'X': 8,
            'Q': 10, 'W': 10, 'Z': 10
        };
    
        let totalValue = 0;
    
        // Iterate through each letter of the word
        for (const letter of word.toUpperCase()) {
            if (rarityValues.hasOwnProperty(letter)) {
                // Add the value of the letter to the total value
                totalValue += rarityValues[letter];
            }
        }
    
        // Check if timesUsed is lower than the average + 1, and add 3 points if it is
        if (this.timesUsed !== null && word.timesUsed < this.timesUsed + 1) {
            totalValue += 3;
        }
    
        // Multiply the total value by 1.4 if the word's length is greater than the average length
        if (this.averageLenght !== null && word.length > this.averageLenght) {
            totalValue *= 1.4;
        }
    
        return Math.floor(totalValue);
    }

    formatDate(date) {
        const day = this.padZero(date.getDate());
        const month = this.padZero(date.getMonth() + 1); // Adding 1 because getMonth() returns zero-based month index
        const year = date.getFullYear();
        const hours = this.padZero(date.getHours());
        const minutes = this.padZero(date.getMinutes());
        const seconds = this.padZero(date.getSeconds());
        
        return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
    }
    
    padZero(num) {
        return num.toString().padStart(2, '0');
    }
    
  }

  module.exports = Joc;