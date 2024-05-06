const mongoose = require('mongoose');
const config = require('./config/db');
// Importar la funció v4 de la biblioteca uuid y Cypto
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const User = require('./api/models/user');
const Img = require('./api/models/image');
const Game = require('./api/models/games');

const { throws } = require('assert');
const getWordSchema = require('./api/models/word');

function processUser(user) {
    const processed = {
        name: String(user.name),
        email: String(user.email),
        phone: String(user.phone_number),
        uuid: String(user.uuid),
        api_key: String(user.api_key)
    };
    return processed;
}

function processImage(user) {
    const processed = {
        userUUID: String(user.uuid),
        base64: String(user.avatar)
    };
    return processed;
}

function processAction(action) {
    const processed = {

    };
    return processAction
}

// Function to process a game object
function processGame(game) {
    // Process players array
    const processedPlayers = game.players.map(player => ({
        name: String(player.name),
        uuid: String(player.uuid),
        score: Number(player.score)
    }));

    // Process words array
    const processedWords = game.words.map(word => ({
        word: String(word.word),
        wordUUID: String(word.wordUUID),
        playerUUID: String(word.playerUUID)
    }));

    // Construct the processed game object
    const processedGame = {
        UUID: String(game.UUID),
        type: String(game.type),
        startDate: String(game.startDate),
        endDate: String(game.endDate),
        dictionaryCode: String(game.dictionaryCode),
        players: processedPlayers,
        letters: game.letters.map(String), // Assuming letters are already strings
        words: processedWords
    };

    return processedGame;
}

async function startUserInsertProcess(user) {
    let connection;
    let api_key
    try {
        connection = await mongoose.connect(config.MONGODB_URI);

        api_key = user.api_key = generateApiKey(32);
        user.api_key = api_key;
	    user.uuid = uuidv4();

        const existingUser = await User.findOne({
            $or: [
                { email: user.email },
                { name: user.name }
            ]
        });

        if (existingUser) {
            console.log("Usuario ya existe");
            // Determine which field is duplicated
            if (existingUser.email === user.email) {
                console.log("email ya existe");
                throw new Error("Email already exists");
            }else if (existingUser.name === user.name) {
                console.log("name ya existe");
                throw new Error("Name already exists");
            } 
            return;
        }

        console.log("antes de inserir user");
        await insertUser(user);

        if (user.hasOwnProperty('avatar')) {
            console.log("antes de inserir user image");
            await insertImage(user);
        }

        return api_key;
    } finally {
        if (connection) {
            //await connection.disconnect();
        }
   
    }
}

async function insertUser(user) {
    const processedUser = processUser(user);
    await User.updateOne({ uuid: processedUser.uuid }, processedUser, { upsert: true });
}

async function insertImage(user) {
    const processedImg = processImage(user);
    await Img.updateOne({ userUUID: processedImg.userUUID }, processedImg, { upsert: true });
}

/*async function insertWord(word, language) {
    let WordSchema = getWordSchema(language);
    await WordSchema.updateOne({ userUUID: processedImg.userUUID }, processedImg, { upsert: true });
}*/

async function insertGame(rawGame) {
    const processedGame = processGame(rawGame);
    await Game.updateOne(processedGame, { upsert: true });
}

async function insertAction(rawAction) {
    //
}

function generateApiKey(length = 64) {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

async function wordExists(language ,wordString) {
    let WordSchema = getWordSchema(language);
    const word = await WordSchema.findOne({ word: wordString});

    if (word) {
        word.timesUsed += 1;
        console.log("updateado");
        WordSchema.updateOne(word);

        return word;
    } else {
        return false;
    }
}

module.exports = {
    startUserInsertProcess,
    generateApiKey,
    wordExists,
    insertGame
};
