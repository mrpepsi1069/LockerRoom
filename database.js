// database.js
const { MongoClient, ObjectId } = require('mongodb');

let client = null;
let db = null;
let connected = false;

async function initialize() {
    if (connected) return;

    try {
        if (!process.env.DATABASE_URL) {
            console.warn('⚠️ DATABASE_URL not set — DB disabled');
            return;
        }

        client = new MongoClient(process.env.DATABASE_URL, {
            serverSelectionTimeoutMS: 5000,
            tls: true,
        });

        await client.connect();
        db = client.db('lockerroom_bot');
        connected = true;

        console.log('✅ MongoDB connected');

        await createIndexes();
    } catch (err) {
        console.error('❌ MongoDB connection failed:', err.message);
        console.warn('⚠️ Continuing without database');
        connected = false;
        db = null;
    }
}

function isConnected() {
    return connected && db;
}

async function createIndexes() {
    if (!isConnected()) return;

    await db.collection('guilds').createIndex({ guild_id: 1 }, { unique: true });
    await db.collection('users').createIndex({ user_id: 1 }, { unique: true });
    await db.collection('leagues').createIndex(
        { guild_id: 1, league_abbr: 1 },
        { unique: true }
    );
}

/* ===================== GUILDS ===================== */

async function createGuild(guildId, guildName) {
    if (!isConnected()) return null;

    await db.collection('guilds').updateOne(
        { guild_id: guildId },
        {
            $set: { guild_name: guildName, updated_at: new Date() },
            $setOnInsert: { created_at: new Date(), premium: false }
        },
        { upsert: true }
    );
}

/* ===================== USERS ===================== */

async function createOrUpdateUser(userId, username) {
    if (!isConnected()) return null;

    await db.collection('users').updateOne(
        { user_id: userId },
        {
            $set: { username, updated_at: new Date() },
            $setOnInsert: { created_at: new Date() }
        },
        { upsert: true }
    );
}

/* ===================== COMMAND LOGGING ===================== */

async function logCommand(commandName, guildId, userId) {
    if (!isConnected()) return;

    await db.collection('command_usage').insertOne({
        command: commandName,
        guild_id: guildId,
        user_id: userId,
        used_at: new Date()
    });
}

module.exports = {
    initialize,
    isConnected,

    createGuild,
    createOrUpdateUser,
    logCommand
};
