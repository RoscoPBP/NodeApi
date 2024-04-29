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
      this.averageLenght = this.getWordAvgLenght(language)
    }
  
    iniciarCicle() {
      setInterval(() => {
        if (this.enPartida) {
          this.properInici = Date.now() + this.pausaDuracio;
          this.playersEspera = this.playersEspera.concat(this.playersJugant);
          this.enPartida = false;
        } else {
          this.properInici = Date.now() + this.partidaDuracio + this.pausaDuracio;
          this.enPartida = true;
          // Send "GAME START" message to players in the playersEspera list
          console.log("Empezando partida | enviando a jugadores");
          this.playersEspera.forEach(player => {
            const { socketId } = player;
            const letters = this.chooseLetters();
            console.log(letters);
            this.websocket.to(socketId).emit('INICI_PARTIDA', letters)});

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

    chooseLetters() {
        console.log(this.averageLenght);
        const vocales = ['A', 'E', 'I', 'O', 'U'];
        const consonantesMuyUsadas = ['L', 'N', 'S', 'T', 'R'];
        const consonantesPocoUsadas = ['B', 'C', 'D', 'F', 'G', 'H', 'J', 'K', 'M', 'P', 'Q', 'V', 'W', 'X', 'Y', 'Z'];
        let chosenLetters = [];
        while (chosenLetters.length < 2) {
            console.log("bucle  1")
            let letter = this.getRandomLetter(vocales)
            if (letter != null) {
                chosenLetters.push(letter);
            }
        }

        while (chosenLetters.length < this.averageLenght) {
            console.log("bucle  2")
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
  }

  module.exports = Joc;