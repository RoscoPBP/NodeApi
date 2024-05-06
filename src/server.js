const {app, joc, io, server} = require('./app');

const dbManager = require('./mongoManager');


const User = require('./api/models/user');

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
          resposta.tiempoRestante = joc.consultaTempsRestant();
          socket.emit('ALTA', resposta);
      } else {
          socket.emit('ALTA', { alta: false, tiempoRestante: joc.consultaTempsRestant() });
      }
  });

  socket.on('PARAULA', async (data) => {
    const parts = data.split(';');
    let paraula, apiKey;
    response = {};
    response.wordExists = false;
    response.value = 0;

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
      const isInWordsArray = joc.gameObject.words.some(wordObj => wordObj.word === paraula);
      console.log("la palabras ya esta puesta = "+isInWordsArray);

      if (isInWordsArray === false) {
        response.wordExists = true;
        const value = joc.calculateWordValue(paraula);
        console.log("players jugant =" + JSON.stringify(joc.playersJugant));
        console.log("players esperant =" + JSON.stringify(joc.playersEspera));
        const playerToUpdate = joc.playersJugant[socket.id];
        
        joc.gameObject.words.push({word:wordExists.word, wordUUID:wordExists._id, playerUUID:user.uuid})

        dbManager.insertAction({gameUUID:joc.gameUUID, playerUUID:user.uuid, type: "PARAULA", data:"score obtenida: "+value, date: joc.formatDate(new Date(Date.now()))});
        
        // broadcast de palabras buena
        io.emit("PARAULA_ACERTADA", JSON.stringify({user:user.name, paraula:wordExists.word}));

        console.log("socketId para poner puntos = "+socket.id);
        if (playerToUpdate) {
          console.log("ESTA ENCONTRANDO AL JUGADOR");
          playerToUpdate.score = playerToUpdate.score + value; 
        }

        response.value = value;
      }
      
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
