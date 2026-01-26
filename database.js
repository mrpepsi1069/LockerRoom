// database.js
const { MongoClient } = require('mongodb');

let client;
let db;

const uri = process.env.MONGODB_URI;
const DB_NAME = 'lockerroom';

async function initialize() {
    if (db) return db;

    client = new MongoClient(uri);
    await client.connect();
    db = client.db(DB_NAME);

    console.log('✅ MongoDB connected');
    return db;
}

/* =========================
   GUILDS
========================= */

async function createGuild(guildId, name) {
    const guilds = db.collection('guilds');
    await guilds.updateOne(
        { guildId },
        { $set: { guildId, name, createdAt: new Date() } },
        { upsert: true }
    );
}

async function getGuild(guildId) {
    return db.collection('guilds').findOne({ guildId });
}

/* =========================
   COMMAND LOGGING
========================= */

async function logCommand(command, guildId, userId) {
    if (!db) return;

    await db.collection('commandLogs').insertOne({
        command,
        guildId,
        userId,
        timestamp: new Date()
    });
}

module.exports = {
    initialize,
    
    // Guild
    createGuild,
    getGuild,
    updateGuildSetup,
    getGuildPreferences,
    setGuildPreferences,
    
    // Channels & Roles
    setGuildChannel,
    getGuildChannels,
    setGuildRole,
    getGuildRoles,
    
    // Leagues
    createLeague,
    getLeagues,
    getLeagueByAbbr,
    
    // Users
    createOrUpdateUser,
    setUserColor,
    
    // Awards
    addChampionshipRing,
    addAward,
    getUserAwards,
    
    // Lineups
    createLineup,
    getLineups,
    getLineup,
    addPlayerToLineup,
    removePlayerFromLineup,
    deleteLineup,
    
    // Gametimes
    createGametime,
    recordAttendance,
    getGametimeAttendance,
    
    // Activity Checks
    createActivityCheck,
    recordActivityResponse,
    
    // Suggestions
    createSuggestion,
    
    // Stats
    logCommand,
    getBotStats,
    setPremium
};