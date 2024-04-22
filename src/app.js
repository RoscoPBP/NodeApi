const express = require('express');
const mongoose = require('mongoose');
const dbConfig = require('./config/db');
const userRoutes = require('./api/routes/userRoutes');
const Event = require('./api/models/event');
const Word = require('./api/models/word');
const dbManager = require('./mongoManager');
const getWordSchema = require('./api/models/word');
const app = express();

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
  try {
    const body = (req.body);
    console.log("en user/update")
    res.status(200).send("recibido 200");
  } catch (err) {
    res.status(400).send(err.message);
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
      response.status = "400";
      response.message = "ERROR: Missing required parameters";
      return res.status(400).send(response);
    }
    
    const min = page * amount;
    const max = page * amount + amount;

    let WordSchema = getWordSchema(lang);
    const word = await WordSchema.find({ position: { $gte: min, $lte: max } });
    if (word) {
      return res.status(404).send("ERROR: Not found");
    }

    response.status = "OK";
    response.message = "Sending page";
    response.data.pages = word;
    res.status(200).send(response);

  } catch (err) {
    console.log(err);
    response.status = "400";
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

module.exports = app;
