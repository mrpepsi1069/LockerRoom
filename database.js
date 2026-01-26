// database.js - MongoDB connection and query functions
const { MongoClient, ObjectId } = require('mongodb');

let client;
let db;

// MongoDB connection
async function initialize() {
    try {
        client = new MongoClient(process.env.DATABASE_URL);
        await client.connect();
        db = client.db('lockerroom_bot');
        console.log('✅ MongoDB connected successfully');
        
        // Create indexes
        await createIndexes();
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error);
        process.exit(1);
    }
}

async function createIndexes() {
    // Guild indexes
    await db.collection('guilds').createIndex({ guild_id: 1 }, { unique: true });
    
    // League indexes
    await db.collection('leagues').createIndex({ guild_id: 1, league_abbr: 1 }, { unique: true });
    
    // Lineup indexes
    await db.collection('lineups').createIndex({ guild_id: 1, lineup_name: 1 }, { unique: true });
    
    // User indexes
    await db.collection('users').createIndex({ user_id: 1 }, { unique: true });
    
    // Championship rings indexes
    await db.collection('championship_rings').createIndex({ guild_id: 1, league_id: 1, user_id: 1, season: 1 }, { unique: true });
    
    // Awards indexes
    await db.collection('awards').createIndex({ guild_id: 1, league_id: 1, user_id: 1, award_name: 1, season: 1 }, { unique: true });
}

// ============================================
// GUILD FUNCTIONS
// ============================================

async function createGuild(guildId, guildName) {
    const result = await db.collection('guilds').updateOne(
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
    return await db.collection('guilds').findOne({ guild_id: guildId });
}

async function getGuild(guildId) {
    return await db.collection('guilds').findOne({ guild_id: guildId });
}

async function updateGuildSetup(guildId, completed) {
    await db.collection('guilds').updateOne(
        { guild_id: guildId },
        { $set: { setup_completed: completed, updated_at: new Date() } }
    );
}

async function getGuildPreferences(guildId) {
    return await db.collection('guild_preferences').findOne({ guild_id: guildId });
}

async function setGuildPreferences(guildId, preferences) {
    await db.collection('guild_preferences').updateOne(
        { guild_id: guildId },
        { 
            $set: {
                ...preferences,
                updated_at: new Date()
            },
            $setOnInsert: { created_at: new Date() }
        },
        { upsert: true }
    );
}

// ============================================
// CHANNEL & ROLE FUNCTIONS
// ============================================

async function setGuildChannel(guildId, channelType, channelId) {
    await db.collection('guild_channels').updateOne(
        { guild_id: guildId, channel_type: channelType },
        { $set: { channel_id: channelId, created_at: new Date() } },
        { upsert: true }
    );
}

async function getGuildChannels(guildId) {
    const channels = await db.collection('guild_channels').find({ guild_id: guildId }).toArray();
    return channels.reduce((acc, ch) => {
        acc[ch.channel_type] = ch.channel_id;
        return acc;
    }, {});
}

async function setGuildRole(guildId, roleType, roleId) {
    await db.collection('guild_roles').updateOne(
        { guild_id: guildId, role_type: roleType },
        { $set: { role_id: roleId, created_at: new Date() } },
        { upsert: true }
    );
}

async function getGuildRoles(guildId) {
    const roles = await db.collection('guild_roles').find({ guild_id: guildId }).toArray();
    return roles.reduce((acc, role) => {
        acc[role.role_type] = role.role_id;
        return acc;
    }, {});
}

// ============================================
// LEAGUE FUNCTIONS
// ============================================

async function createLeague(guildId, leagueName, leagueAbbr, signupLink = null) {
    const league = {
        guild_id: guildId,
        league_name: leagueName,
        league_abbr: leagueAbbr.toUpperCase(),
        signup_link: signupLink,
        is_active: true,
        created_at: new Date()
    };
    
    const result = await db.collection('leagues').insertOne(league);
    return { ...league, _id: result.insertedId };
}

async function getLeagues(guildId) {
    return await db.collection('leagues').find({ guild_id: guildId, is_active: true }).sort({ created_at: 1 }).toArray();
}

async function getLeagueByAbbr(guildId, leagueAbbr) {
    return await db.collection('leagues').findOne({ guild_id: guildId, league_abbr: leagueAbbr.toUpperCase() });
}

// ============================================
// USER FUNCTIONS
// ============================================

async function createOrUpdateUser(userId, username, customColor = null) {
    await db.collection('users').updateOne(
        { user_id: userId },
        { 
            $set: { 
                username: username,
                updated_at: new Date()
            },
            $setOnInsert: { 
                custom_color: customColor,
                created_at: new Date() 
            }
        },
        { upsert: true }
    );
    
    return await db.collection('users').findOne({ user_id: userId });
}

async function setUserColor(userId, color) {
    await db.collection('users').updateOne(
        { user_id: userId },
        { $set: { custom_color: color, updated_at: new Date() } }
    );
}

// ============================================
// AWARDS & RINGS FUNCTIONS
// ============================================

async function addChampionshipRing(guildId, leagueId, userId, season, opponent, awardedBy) {
    try {
        const ring = {
            guild_id: guildId,
            league_id: leagueId.toString(),
            user_id: userId,
            season: season,
            opponent: opponent,
            awarded_by: awardedBy,
            awarded_at: new Date()
        };
        
        const result = await db.collection('championship_rings').insertOne(ring);
        return { ...ring, _id: result.insertedId };
    } catch (error) {
        if (error.code === 11000) { // Duplicate key
            return null;
        }
        throw error;
    }
}

async function addAward(guildId, leagueId, userId, awardName, season, awardedBy) {
    try {
        const award = {
            guild_id: guildId,
            league_id: leagueId.toString(),
            user_id: userId,
            award_name: awardName,
            season: season,
            awarded_by: awardedBy,
            awarded_at: new Date()
        };
        
        const result = await db.collection('awards').insertOne(award);
        return { ...award, _id: result.insertedId };
    } catch (error) {
        if (error.code === 11000) { // Duplicate key
            return null;
        }
        throw error;
    }
}

async function getUserAwards(guildId, userId) {
    const user = await db.collection('users').findOne({ user_id: userId });
    if (!user) return null;
    
    const rings = await db.collection('championship_rings').aggregate([
        { $match: { guild_id: guildId, user_id: userId } },
        { 
            $lookup: {
                from: 'leagues',
                localField: 'league_id',
                foreignField: '_id',
                as: 'league_info'
            }
        },
        {
            $project: {
                league: { $arrayElemAt: ['$league_info.league_name', 0] },
                season: 1,
                opponent: 1
            }
        }
    ]).toArray();
    
    const awards = await db.collection('awards').aggregate([
        { $match: { guild_id: guildId, user_id: userId } },
        { 
            $lookup: {
                from: 'leagues',
                localField: 'league_id',
                foreignField: '_id',
                as: 'league_info'
            }
        },
        {
            $project: {
                league: { $arrayElemAt: ['$league_info.league_name', 0] },
                award: '$award_name',
                season: 1
            }
        }
    ]).toArray();
    
    return {
        username: user.username,
        rings: rings,
        awards: awards
    };
}

// ============================================
// LINEUP FUNCTIONS
// ============================================

async function createLineup(guildId, lineupName, description, createdBy) {
    try {
        const lineup = {
            guild_id: guildId,
            lineup_name: lineupName,
            description: description,
            created_by: createdBy,
            players: [],
            created_at: new Date()
        };
        
        const result = await db.collection('lineups').insertOne(lineup);
        return { ...lineup, _id: result.insertedId };
    } catch (error) {
        if (error.code === 11000) {
            throw new Error('DUPLICATE_LINEUP');
        }
        throw error;
    }
}

async function getLineups(guildId) {
    return await db.collection('lineups').find({ guild_id: guildId }).sort({ created_at: 1 }).toArray();
}

async function getLineup(guildId, lineupName) {
    const lineup = await db.collection('lineups').findOne({ guild_id: guildId, lineup_name: lineupName });
    if (!lineup) return null;
    
    // Populate player usernames
    if (lineup.players && lineup.players.length > 0) {
        const userIds = lineup.players.map(p => p.user_id);
        const users = await db.collection('users').find({ user_id: { $in: userIds } }).toArray();
        
        lineup.players = lineup.players.map(player => {
            const user = users.find(u => u.user_id === player.user_id);
            return {
                ...player,
                username: user ? user.username : 'Unknown'
            };
        });
    }
    
    return lineup;
}

async function addPlayerToLineup(lineupId, userId, position) {
    const lineup = await db.collection('lineups').findOne({ _id: new ObjectId(lineupId) });
    if (!lineup) throw new Error('Lineup not found');
    
    // Remove player if already exists
    let players = lineup.players.filter(p => p.user_id !== userId);
    
    // Add player with new position
    players.push({
        user_id: userId,
        position: position,
        added_at: new Date()
    });
    
    await db.collection('lineups').updateOne(
        { _id: new ObjectId(lineupId) },
        { $set: { players: players, updated_at: new Date() } }
    );
    
    return { user_id: userId, position: position };
}

async function removePlayerFromLineup(lineupId, userId) {
    const lineup = await db.collection('lineups').findOne({ _id: new ObjectId(lineupId) });
    if (!lineup) throw new Error('Lineup not found');
    
    const players = lineup.players.filter(p => p.user_id !== userId);
    
    await db.collection('lineups').updateOne(
        { _id: new ObjectId(lineupId) },
        { $set: { players: players, updated_at: new Date() } }
    );
}

async function deleteLineup(guildId, lineupName) {
    await db.collection('lineups').deleteOne({ guild_id: guildId, lineup_name: lineupName });
}

// ============================================
// GAMETIME FUNCTIONS
// ============================================

async function createGametime(guildId, leagueId, gameTime, messageId, channelId, pingRoleId, createdBy) {
    const gametime = {
        guild_id: guildId,
        league_id: leagueId.toString(),
        game_time: gameTime,
        message_id: messageId,
        channel_id: channelId,
        ping_role_id: pingRoleId,
        created_by: createdBy,
        is_active: true,
        responses: [],
        created_at: new Date()
    };
    
    const result = await db.collection('gametimes').insertOne(gametime);
    return { ...gametime, _id: result.insertedId };
}

async function recordAttendance(gametimeId, userId, response) {
    const gametime = await db.collection('gametimes').findOne({ _id: new ObjectId(gametimeId) });
    if (!gametime) throw new Error('Gametime not found');
    
    // Remove previous response from this user
    let responses = gametime.responses.filter(r => r.user_id !== userId);
    
    // Add new response
    responses.push({
        user_id: userId,
        response: response,
        responded_at: new Date()
    });
    
    await db.collection('gametimes').updateOne(
        { _id: new ObjectId(gametimeId) },
        { $set: { responses: responses } }
    );
}

async function getGametimeAttendance(gametimeId) {
    const gametime = await db.collection('gametimes').findOne({ _id: new ObjectId(gametimeId) });
    if (!gametime || !gametime.responses) return [];
    
    const userIds = gametime.responses.map(r => r.user_id);
    const users = await db.collection('users').find({ user_id: { $in: userIds } }).toArray();
    
    return gametime.responses.map(resp => {
        const user = users.find(u => u.user_id === resp.user_id);
        return {
            response: resp.response,
            username: user ? user.username : 'Unknown',
            user_id: resp.user_id
        };
    });
}

// ============================================
// ACTIVITY CHECK FUNCTIONS
// ============================================

async function createActivityCheck(guildId, messageId, channelId, expiresAt, createdBy) {
    const activityCheck = {
        guild_id: guildId,
        message_id: messageId,
        channel_id: channelId,
        expires_at: expiresAt,
        created_by: createdBy,
        is_active: true,
        responses: [],
        created_at: new Date()
    };
    
    const result = await db.collection('activity_checks').insertOne(activityCheck);
    return { ...activityCheck, _id: result.insertedId };
}

async function recordActivityResponse(activityCheckId, userId) {
    await db.collection('activity_checks').updateOne(
        { _id: new ObjectId(activityCheckId) },
        { $addToSet: { responses: { user_id: userId, responded_at: new Date() } } }
    );
}

// ============================================
// SUGGESTION FUNCTIONS
// ============================================

async function createSuggestion(guildId, userId, suggestionText) {
    const suggestion = {
        guild_id: guildId,
        user_id: userId,
        suggestion_text: suggestionText,
        status: 'pending',
        created_at: new Date()
    };
    
    const result = await db.collection('suggestions').insertOne(suggestion);
    return { ...suggestion, _id: result.insertedId };
}

// ============================================
// STATS & LOGGING
// ============================================

async function logCommand(commandName, guildId, userId) {
    await db.collection('command_usage').insertOne({
        command_name: commandName,
        guild_id: guildId,
        user_id: userId,
        used_at: new Date()
    });
}

async function getBotStats() {
    const totalGuilds = await db.collection('guilds').countDocuments();
    const totalUsers = await db.collection('users').countDocuments();
    const totalCommands = await db.collection('command_usage').countDocuments();
    const premiumGuilds = await db.collection('guilds').countDocuments({ premium: true });
    
    return {
        total_guilds: totalGuilds,
        total_users: totalUsers,
        total_commands_used: totalCommands,
        premium_guilds: premiumGuilds
    };
}

async function setPremium(guildId, isPremium, expiresAt = null) {
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