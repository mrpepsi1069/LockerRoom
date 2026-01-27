// database.js - MongoDB connection and query functions
const { MongoClient, ObjectId } = require('mongodb');

let client;
let db;
let ready = false;

// MongoDB connection
async function initialize() {
    try {
        const options = {
            tls: true,
            tlsAllowInvalidCertificates: true,
            tlsAllowInvalidHostnames: true,
            serverSelectionTimeoutMS: 5000,
        };

        client = new MongoClient(process.env.DATABASE_URL, options);
        await client.connect();
        db = client.db('lockerroom_bot');
        ready = true;

        console.log('✅ MongoDB connected successfully');

        await createIndexes();
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        console.error('⚠️ Bot will continue without database - some features may not work');
        ready = false;
    }
}

function isReady() {
    return ready && db;
}

async function createIndexes() {
    if (!isReady()) return;

    await db.collection('guilds').createIndex({ guild_id: 1 }, { unique: true });
    await db.collection('leagues').createIndex({ guild_id: 1, league_abbr: 1 }, { unique: true });
    await db.collection('lineups').createIndex({ guild_id: 1, lineup_name: 1 }, { unique: true });
    await db.collection('users').createIndex({ user_id: 1 }, { unique: true });
    await db.collection('championship_rings').createIndex(
        { guild_id: 1, league_id: 1, user_id: 1, season: 1 },
        { unique: true }
    );
    await db.collection('awards').createIndex(
        { guild_id: 1, league_id: 1, user_id: 1, award_name: 1, season: 1 },
        { unique: true }
    );
}

// ============================================
// GUILD FUNCTIONS
// ============================================

async function createGuild(guildId, guildName) {
    if (!isReady()) return null;

    await db.collection('guilds').updateOne(
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

    return getGuild(guildId);
}

async function getGuild(guildId) {
    if (!isReady()) return null;
    return db.collection('guilds').findOne({ guild_id: guildId });
}

async function updateGuildSetup(guildId, completed) {
    if (!isReady()) return;
    await db.collection('guilds').updateOne(
        { guild_id: guildId },
        { $set: { setup_completed: completed, updated_at: new Date() } }
    );
}

async function getGuildPreferences(guildId) {
    if (!isReady()) return null;
    return db.collection('guild_preferences').findOne({ guild_id: guildId });
}

async function setGuildPreferences(guildId, preferences) {
    if (!isReady()) return;

    await db.collection('guild_preferences').updateOne(
        { guild_id: guildId },
        {
            $set: { ...preferences, updated_at: new Date() },
            $setOnInsert: { created_at: new Date() }
        },
        { upsert: true }
    );
}

// ============================================
// CHANNEL & ROLE FUNCTIONS
// ============================================

async function setGuildChannel(guildId, channelType, channelId) {
    if (!isReady()) return;

    await db.collection('guild_channels').updateOne(
        { guild_id: guildId, channel_type: channelType },
        { $set: { channel_id: channelId, created_at: new Date() } },
        { upsert: true }
    );
}

async function getGuildChannels(guildId) {
    if (!isReady()) return {};
    const channels = await db.collection('guild_channels').find({ guild_id: guildId }).toArray();
    return channels.reduce((acc, ch) => {
        acc[ch.channel_type] = ch.channel_id;
        return acc;
    }, {});
}

async function setGuildRole(guildId, roleType, roleId) {
    if (!isReady()) return;

    await db.collection('guild_roles').updateOne(
        { guild_id: guildId, role_type: roleType },
        { $set: { role_id: roleId, created_at: new Date() } },
        { upsert: true }
    );
}

async function getGuildRoles(guildId) {
    if (!isReady()) return {};
    const roles = await db.collection('guild_roles').find({ guild_id: guildId }).toArray();
    return roles.reduce((acc, role) => {
        acc[role.role_type] = role.role_id;
        return acc;
    }, {});
}

// ============================================
// STATS & LOGGING
// ============================================

async function logCommand(commandName, guildId, userId) {
    if (!isReady()) return;

    await db.collection('command_usage').insertOne({
        command_name: commandName,
        guild_id: guildId,
        user_id: userId,
        used_at: new Date()
    });
}

async function getBotStats() {
    if (!isReady()) {
        return {
            total_guilds: 0,
            total_users: 0,
            total_commands_used: 0,
            premium_guilds: 0
        };
    }

    return {
        total_guilds: await db.collection('guilds').countDocuments(),
        total_users: await db.collection('users').countDocuments(),
        total_commands_used: await db.collection('command_usage').countDocuments(),
        premium_guilds: await db.collection('guilds').countDocuments({ premium: true })
    };
}

async function setPremium(guildId, isPremium, expiresAt = null) {
    if (!isReady()) return;

    await db.collection('guilds').updateOne(
        { guild_id: guildId },
        { $set: { premium: isPremium, premium_expires_at: expiresAt } }
    );
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

    // Stats
    logCommand,
    getBotStats,
    setPremium
};
