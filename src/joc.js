const User = require('./api/models/user');
const getWordSchema = require('./api/models/word');

class Joc {
    constructor(partidaDuracio, pausaDuracio, websocket, language) {
      this.partidaDuracio = partidaDuracio;
      this.pausaDuracio = pausaDuracio;
      this.properInici = Date.now() + this.partidaDuracio + this.pausaDuracio;
      this.enPartida = false;
      this.websocket = websocket;
      this.playersJugant = [];
      this.playersEspera = [];
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
          console.log("FIN del game");

          this.enPartida = false;
        } else {

          this.properInici = Date.now() + this.partidaDuracio + this.pausaDuracio;
          this.enPartida = true;

          console.log("Empezando partida | enviando a jugadores");
          this.playersEspera.forEach(player => {
            const { socketId } = player;
            const letters = this.chooseLetters();
            console.log(letters);
            this.websocket.to(socketId).emit('INICI_PARTIDA', {letters:letters})});

          this.playersJugant = this.playersEspera;
          this.playersEspera = [];

        }
      }, this.partidaDuracio + this.pausaDuracio);
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
            this.playersEspera.push({socketId: sockerId, user: user});
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
    
        return totalValue;
    }
  }

  module.exports = Joc;