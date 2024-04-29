const Joc = require('./joc.js');

const app = require('./app');
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server);

const joc = new Joc(60000, 60000);  // 1 minut de partida, 1 minut de pausa

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

  socket.on('ALTA', (data) => {
    console.log("en ALTA " + data);
    const resposta = joc.altaJugador(data.nickname, data.apiKey);
    socket.emit('ALTA', resposta);
  });

  socket.on('PARAULA', () => {
    console.log("en PARAULA")
    socket.emit('PARAULA', "desde PARAULA");
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
