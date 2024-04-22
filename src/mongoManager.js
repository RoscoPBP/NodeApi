const mongoose = require('mongoose');
const config = require('./config/db');
// Importar la funció v4 de la biblioteca uuid y Cypto
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const User = require('./api/models/user');
const Img = require('./api/models/image');

const { throws } = require('assert');

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
                throw new Error("Email already exists");
            }else if (existingUser.name === user.name) {
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

function generateApiKey(length = 64) {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

module.exports = {
    startUserInsertProcess,
    generateApiKey
};
