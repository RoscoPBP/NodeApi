const User = require('./api/models/user');

class Joc {
    constructor(partidaDuracio, pausaDuracio, websocket) {
      this.partidaDuracio = partidaDuracio;
      this.pausaDuracio = pausaDuracio;
      this.properInici = Date.now() + this.partidaDuracio + this.pausaDuracio;
      this.enPartida = false;
      this.websocket = websocket;
      this.playersJugant = [];
      this.playersEspera = [];
      this.iniciarCicle();
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
          console.log("enviando a jugadores");
          this.playersEspera.forEach(player => {
            const { socketId } = player;
            console.log(socketId)
            websocket.to(socketId).emit('INICI_PARTIDA', 'a,b,c,d,f,g,h');
          });
        }
      }, this.partidaDuracio + this.pausaDuracio);
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