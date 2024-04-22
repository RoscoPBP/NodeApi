const express = require('express');
const mongoose = require('mongoose');
const dbConfig = require('./config/db');
const userRoutes = require('./api/routes/userRoutes');
const Event = require('./api/models/event');
const dbManager = require('./mongoManager');
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

    const api_key= await dbManager.startUserInsertProcess(body);
    console.log("api key desde endpoint:"+api_key );
    response.data.api_key = api_key;
    response.status = "OK";
    response.message = "User added";
    res.status(200).send(response);
  } catch (err) {
    console.log(err);
    response.status = "400";
    response.message = "ERROR";
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

app.get('/api/dictionary/:lang/:max/:len', async (req, res) => {
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
