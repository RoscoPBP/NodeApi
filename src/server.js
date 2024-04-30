const Joc = require('./joc.js');

const app = require('./app');
const http = require('http');
const { Server } = require('socket.io');
const dbManager = require('./mongoManager');
const server = http.createServer(app);
const io = new Server(server);

const joc = new Joc(5000, 5000, io, "CA");  // 1 minut de partida, 1 minut de pausa

io.on('connection', (socket) => {
  console.log('Usuari connectat');
  
  const intervalId = setInterval(() => {
    const resposta = joc.consultaTempsRestant();
    socket.emit('TEMPS_PER_INICI', resposta);
  }, 10000);  // Envia el temps restant cada 10 segons

  socket.on('TEMPS_PER_INICI', () => {
    console.log("en TEMPS_PER_INICI")
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

  socket.on('PARAULA', (data) => {
    const parts = data.split(';');
    let paraula, apiKey;
    response = {};
    response.wordExists = false;

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
    const exists = dbManager.wordExists("CA", paraula)

    if (exists === true) {
      response.wordExists = true;
      response.value = joc.calculateWordValue(paraula);
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
