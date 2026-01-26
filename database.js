// database.js - MongoDB connection and query functions
const { MongoClient, ObjectId } = require('mongodb');

let client;
let db;

// ==============================
// INTERNAL DB GUARD
// ==============================
function getDB() {
    if (!db) {
        throw new Error('Database not initialized yet');
    }
    return db;
}

// ==============================
// MONGODB INITIALIZATION
// ==============================
async function initialize() {
    try {
        client = new MongoClient(process.env.DATABASE_URL);
        await client.connect();

        db = client.db('lockerroom_bot');
        console.log('✅ MongoDB connected successfully');

        await createIndexes();
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error);
        throw error;
    }
}

async function createIndexes() {
    await getDB().collection('guilds').createIndex({ guild_id: 1 }, { unique: true });
    await getDB().collection('leagues').createIndex({ guild_id: 1, league_abbr: 1 }, { unique: true });
    await getDB().collection('lineups').createIndex({ guild_id: 1, lineup_name: 1 }, { unique: true });
    await getDB().collection('users').createIndex({ user_id: 1 }, { unique: true });
    await getDB().collection('championship_rings').createIndex(
        { guild_id: 1, league_id: 1, user_id: 1, season: 1 },
        { unique: true }
    );
    await getDB().collection('awards').createIndex(
        { guild_id: 1, league_id: 1, user_id: 1, award_name: 1, season: 1 },
        { unique: true }
    );
}

// ==============================
// GUILD FUNCTIONS
// ==============================
async function createGuild(guildId, guildName) {
    await getDB().collection('guilds').updateOne(
        { guild_id: guildId },
        {
            $set: { guild_name: guildName },
            $setOnInsert: {
                premium: false,
                setup_completed: false,
                created_at: new Date()
            }
        },
        { upsert: true }
    );

    return getDB().collection('guilds').findOne({ guild_id: guildId });
}

// ==============================
// COMMAND LOGGING
// ==============================
async function logCommand(commandName, guildId, userId) {
    await getDB().collection('command_usage').insertOne({
        command_name: commandName,
        guild_id: guildId,
        user_id: userId,
        used_at: new Date()
    });
}

// ==============================
// BOT STATS
// ==============================
async function getBotStats() {
    return {
        total_guilds: await getDB().collection('guilds').countDocuments(),
        total_users: await getDB().collection('users').countDocuments(),
        total_commands_used: await getDB().collection('command_usage').countDocuments(),
        premium_guilds: await getDB().collection('guilds').countDocuments({ premium: true })
    };
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