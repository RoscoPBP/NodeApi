const Joc = require('./joc.js');

const app = require('./app');
const http = require('http');
const { Server } = require('socket.io');
const dbManager = require('./mongoManager');
const server = http.createServer(app);
const io = new Server(server);
const User = require('./api/models/user');

const joc = new Joc(10000, 10000, io, "CA");  // 1 minut de partida, 1 minut de pausa

io.on('connection', (socket) => {
  console.log('Usuari connectat');
  
  const intervalId = setInterval(() => {
    const resposta = joc.consultaTempsRestant();
    socket.emit('TEMPS_PER_INICI', resposta);
  }, 10000);  // Envia el temps restant cada 10 segons

  socket.on('TEMPS_PER_INICI', () => {
    const resposta = joc.consultaTempsRestant();
    socket.emit('TEMPS_PER_INICI', resposta);
  });

  socket.on('ALTA', async (data) => {
      const parts = data.split(';');
      let nickname, apiKey;

      parts.forEach(part => {
          const [key, value] = part.split('=');
          if (key === 'ALTA') {
              nickname = value;
          } else if (key === 'API_KEY') {
              apiKey = value;
          }
      });

      if (nickname && apiKey) {
          const resposta = await joc.altaJugador(nickname, apiKey, socket.id);
          console.log(resposta);
          socket.emit('ALTA', resposta);
      } else {
          socket.emit('ALTA', { alta: false });
      }
  });

  socket.on('PARAULA', async (data) => {
    const parts = data.split(';');
    let paraula, apiKey;
    response = {};
    response.wordExists = false;

    if (joc.enPartida === false) {
      socket.emit("PARAULA_OK", response);
      return;
    }

    parts.forEach(part => {
        const [key, value] = part.split('=');
        if (key === 'PARAULA') {
            paraula = value;
        } else if (key === 'API_KEY') {
            apiKey = value;
        }
    });

    // Now you have both variables available
    console.log("Paraula:", paraula);
    console.log("API Key:", apiKey);

    const user = await User.findOne({ api_key: apiKey});

    if (!user) {
      response.wordExists = false;
      socket.emit("PARAULA_OK", response);
      return;
    } 

    const wordExists = await dbManager.wordExists("CA", paraula)

    if (wordExists) {
      response.wordExists = true;
      const value = joc.calculateWordValue(paraula);
      console.log("players jugant =" + JSON.stringify(joc.playersJugant));
      console.log("players esperant =" + JSON.stringify(joc.playersEspera));
      const playerToUpdate = joc.playersJugant[socket.id];
      
      joc.gameObject.words.push({word:wordExists.word, wordUUID:wordExists._id, playerUUID:user.uuid})

      console.log("socketId para poner puntos = "+socket.id);
      if (playerToUpdate) {
        console.log("ESTA ENCONTRANDO AL JUGADOR");
        playerToUpdate.score = playerToUpdate.score + value; 
      }

      response.value = value;
    } 

    socket.emit("PARAULA_OK", response);
  });

  socket.onAny((event, ...args) => {
    if (event !== 'consulta temps' && event !== 'disconnect' && event !== 'connect' && event !== 'TEMPS_PER_INICI' && event !== 'ALTA' && event !== 'PARAULA') {
      console.log(`Comanda no reconeguda: ${event}`);
      const resposta = joc.consultaTempsRestant();
      socket.emit('TEMPS_PER_INICI', resposta);
    }
  });

  socket.on('disconnect', () => {
    console.log('Usuari desconnectat');
    clearInterval(intervalId);  // Atura l'enviament periòdic quan l'usuari es desconnecta
  });
});

const port = process.env.PORT || 80;
//const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Escoltant en el port ${port}...`));

module.exports = joc;