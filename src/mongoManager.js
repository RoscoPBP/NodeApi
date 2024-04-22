const mongoose = require('mongoose');
const config = require('./config/db');
// Importar la funció v4 de la biblioteca uuid y Cypto
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const User = require('./api/models/user');
const Img = require('./api/models/image');

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
        userUuid: String(user.uuid),
        base64: String(user.avatar)
    };
    return processed;
}

async function startUserInsertProcess(user) {
    let connection;
    try {
        connection = await mongoose.connect(config.MONGODB_URI);

        user.api_key = generateApiKey(32);
        user.uuid = uuidv4();

        console.log("antes de inserir user");
        await insertUser(user);

        if (user.hasOwnProperty('avatar')) {
            console.log("antes de inserir user image");
            await insertImage(user);
        }
    } finally {
        if (connection) {
            await connection.disconnect();
        }
    }
}

async function insertUser(user) {
    const processedUser = processUser(user);
    await User.updateOne({ uuid: processedUser.uuid }, processedUser, { upsert: true });
}

async function insertImage(user) {
    const processedUser = processImage(user);
    await Img.updateOne(processedUser);
}

function generateApiKey(length = 64) {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

module.exports = {
    startUserInsertProcess,
    generateApiKey
};