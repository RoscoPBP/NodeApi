const express = require('express');
const mongoose = require('mongoose');
const dbConfig = require('./config/db');
const bodyParser = require('body-parser');
const userRoutes = require('./api/routes/userRoutes');
const Event = require('./api/models/event');
const Word = require('./api/models/word');
const User = require('./api/models/user');
const Game = require('./api/models/games');
const Action = require('./api/models/actions');
const DictNames = require('./api/models/dictionary_names');
const dbManager = require('./mongoManager');
const getWordSchema = require('./api/models/word');
const Img = require('./api/models/image');
const app = express();
const Joc = require('./joc.js');

const http = require('http');
const { Server } = require('socket.io');
const server = http.createServer(app);
const io = new Server(server);
const joc = new Joc(30000, 30000, io, "CA");  // 1 minut de partida, 1 minut de pausa

// Use body-parser middleware with increased payload size limit
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

app.use(express.json());
app.set('json spaces', 2);

mongoose.connect(dbConfig.MONGODB_URI).then(() => console.log("Connectat a MongoDB"))
  .catch(err => console.error("No s'ha pogut connectar a MongoDB", err));

app.get('/api/health', (req, res) => {
  res.json({ status: "OK" });
});

app.use('/api', userRoutes);

app.post('/api/events', async (req, res) => {
  try {
    const event = new Event(req.body);
    await event.save();
    res.status(201).send(event);
  } catch (err) {
    res.status(400).send(err.message);
  }
});

app.post('/api/user/register', async (req, res) => {
  let response = {};
  response.data = {};
  console.log("en user/register")
  try {
    const body = (req.body);
    console.log("request body: "+JSON.stringify(body))

    const api_key = await dbManager.startUserInsertProcess(body);
    console.log("api key desde endpoint:"+api_key );
    response.data.api_key = api_key;
    response.status = "OK";
    response.message = "User added";
    res.status(200).send(response);
  } catch (err) {
    console.log(err);
    response.status = "400";
    response.message = "ERROR: " + err.message; 
    res.status(400).send(response);
  }
});

app.post('/api/user/update', async (req, res) => {
  let response = {};
  response.data = {};
  console.log("en user/update")
  try {
    const body = req.body;
    //console.log("request body: " + JSON.stringify(body))

    // Check if the request body has at least one of the required attributes
    if (!body.name && !body.email && !body.avatar && !body.phone_number) {
      throw new Error("At least one of the attributes 'name', 'email', 'avatar', or 'phone_number' is required.");
    }

    // Extract the api_key from the request body
    const api_key = body.api_key;

    // Find the user by api_key
    const user = await User.findOne({ api_key:api_key });

    // If no user found or multiple users found, throw an error
    if (!user) {
      throw new Error("No user found with the provided api_key.");
    } else if (user.length > 1) {
      throw new Error("Multiple users found with the provided api_key.");
    }

    // If user found, update the user attributes
    // Here, you can use the $set operator to update only the provided attributes
    const updateData = {};
    if (body.name) updateData.name = body.name;
    if (body.email) updateData.email = body.email;
    if (body.phone_number) updateData.phone = body.phone_number;

    if (body.avatar) {
      await Img.updateOne({ userUUID: user.uuid }, { userUUID: user.uuid , base64: body.avatar}, { upsert: true });
    }

    // Update the user document
    await User.updateOne({ api_key:api_key }, { $set: updateData });

    // Send the response
    response.status = "OK";
    response.message = "User updated";
    res.status(200).send(response);
  } catch (err) {
    console.log(err);
    response.status = "400";
    response.message = "ERROR: " + err.message;
    res.status(400).send(response);
  }
});

app.post('/api/dictionary/list', async (req, res) => {
  let response = {};
  response.data = {};
  console.log('/api/dictionary/list');
  
  try {
    const body = (req.body);
    console.log("request body: "+JSON.stringify(body))
    const lang = body.idioma;
    const amount = body.cantidad;
    const page = body.pagina;

    if (!lang || !amount || !page) {
      response.status = "ERROR";
      response.message = "ERROR: Missing required parameters";
      return res.status(400).send(response);
    }
    
    let min;
    let  max;
    if (page === 1) {
      min = 0;
      max = amount;
    } else {
      min = page * amount - amount + 1;
      max = page * amount;
    }

    let WordSchema = getWordSchema(lang);
    const word = await WordSchema.find({ position: { $gte: min, $lte: max } });
    if (!word) {
      response.status = "ERROR";
      response.message = "ERROR: Words not found";
      return res.status(403).send(message);
    }

    response.status = "OK";
    response.message = "Sending page";
    response.data.pages = word;
    res.status(200).send(response);

  } catch (err) {
    console.log(err);
    response.status = "ERROR";
    response.message = "ERROR: " + err.message; 
    res.status(400).send(response);
  }
});

app.get('/api/dictionary/:country/lenght', async (req, res) => {
  let response = {};
  response.data = {};
  try {
    let WordSchema = getWordSchema(req.params.country);
    const count = await WordSchema.countDocuments();
    console.log(count);
    if (count) {
      response.status = "OK";
      response.message = "Sending total words";
      response.data.count = count;
      return res.status(200).send(response);
    }

    response.status = "403";
    response.message = "ERROR: Language not found"; 
    res.send(response);
  } catch (err) {
    console.log(err);
    response.status = "400";
    response.message = "ERROR: " + err.message; 
    res.status(500).send(response);
  }
});

app.get('/api/dictionary/languages', async (req, res) => {
  let response = {};
  response.data = {};
  try {
    const dictionaries = await DictNames.find();

    if (dictionaries) {
      response.status = "OK";
      response.message = "Sending total words";
      response.data.languages = dictionaries;
      return res.status(200).send(response);
    }

    response.status = "403";
    response.message = "ERROR: Languge list not found"; 
    res.send(response);
  } catch (err) {
    console.log(err);
    response.status = "400";
    response.message = "ERROR: " + err.message; 
    res.status(500).send(response);
  }
});

app.get('/api/events/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).send("L'esdeveniment no s'ha trobat.");
    }
    res.send(event);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Conseguir informacion de la partida en juego
app.get('/api/game/data', async (req, res) => {
  let data = {};
  try {
    data.enPartida = joc.enPartida;
    data.data = joc.gameObject;
    res.send(data);
  } catch (err) {
    console.log(err);
    res.status(500).send(err.message);
  }
});

// Volcado de users data
app.get('/api/list/users', async (req, res) => {
  try {
    const users = await User.find();
    if (!users) {
      return res.status(404).send("No hay users");
    }
    res.send(users);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Volcado de users data
app.get('/api/list/games', async (req, res) => {
  try {
    const users = await Game.find();
    if (!users) {
      return res.status(404).send("No hay users");
    }
    res.send(users);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Volcado de users data
app.get('/api/list/actions', async (req, res) => {
  try {
    const users = await Action.find();
    if (!users) {
      return res.status(404).send("No hay users");
    }
    res.send(users);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

module.exports = {app, joc, io, server};
