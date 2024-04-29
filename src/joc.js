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
      this.averageLenght = getWordAvgLenght(language)
    }
  
    iniciarCicle() {
      setInterval(() => {
        if (this.enPartida) {
          this.properInici = Date.now() + this.pausaDuracio;
          this.enPartida = false;
        } else {
          this.properInici = Date.now() + this.partidaDuracio + this.pausaDuracio;
          this.enPartida = true;
          // Send "GAME START" message to players in the playersEspera list
          console.log("Empezando partida | enviando a jugadores");
          this.playersEspera.forEach(player => {
            const { socketId } = player;
            console.log(socketId)
            this.websocket.to(socketId).emit('INICI_PARTIDA', 'a,b,c,d,f,g,h');
          });

          this.playersJugant = this.playersEspera;
          this.playersEspera = [];
        }
      }, this.partidaDuracio + this.pausaDuracio);
    }

    async getWordAvgLenght(language) {
        const WordSchema = getWordSchema(language);
        const averageLengthResult = await WordSchema.aggregate([
        {
            $match: { position: { $gte: min, $lte: max } }
        },
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

        return averageLength;
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