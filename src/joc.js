const User = require('./api/models/user');

class Joc {
    constructor(partidaDuracio, pausaDuracio) {
      this.partidaDuracio = partidaDuracio;
      this.pausaDuracio = pausaDuracio;
      this.properInici = Date.now() + this.partidaDuracio + this.pausaDuracio;
      this.enPartida = false;
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
        }
      }, this.partidaDuracio + this.pausaDuracio);
    }
  
    consultaTempsRestant() {
      const tempsRestant = this.properInici - Date.now();
      return { tempsRestant, enPartida: this.enPartida };
    }

    async altaJugador(name, apiKey) {
        const user = await User.findOne({ api_key: apiKey, name: name });

        if (user) {
            return { alta: true };
        } else {
            return { alta: false };
        }
    }
  }

  module.exports = Joc;