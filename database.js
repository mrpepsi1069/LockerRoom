// database.js - MongoDB connection and query functions
const { MongoClient, ObjectId } = require('mongodb');

let client;
let db;

// MongoDB connection
async function initialize() {
    try {
        const options = {
            tls: true,
            tlsAllowInvalidCertificates: true,
            serverSelectionTimeoutMS: 5000,
        };
        
        client = new MongoClient(process.env.DATABASE_URL, options);
        await client.connect();
        db = client.db('lockerroom_bot');
        console.log('✅ MongoDB connected');
        
        // Create indexes
        await createIndexes();
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        console.error('⚠️ Continuing without database');
        // Don't exit, let bot run without DB
    }
}

async function createIndexes() {
    if (!db) return;

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
    await db.collection('gametime_rsvps').createIndex({ messageId: 1 }, { unique: true });
    await db.collection('depth_charts').createIndex({ guildId: 1, abbreviation: 1 }, { unique: true });
}

// ============================================
// GUILD FUNCTIONS
// ============================================

async function createGuild(guildId, guildName) {
    if (!db) return null;
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
    if (!db) return null;
    return await db.collection('guilds').findOne({ guild_id: guildId });
}

async function updateGuildSetup(guildId, completed) {
    if (!db) return;
    await db.collection('guilds').updateOne(
        { guild_id: guildId },
        { $set: { setup_completed: completed, updated_at: new Date() } }
    );
}

async function getGuildPreferences(guildId) {
    if (!db) return null;
    return await db.collection('guild_preferences').findOne({ guild_id: guildId });
}

async function setGuildPreferences(guildId, preferences) {
    if (!db) return;
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

async function getGuildConfig(guildId) {
    if (!db) return null;
    return await db.collection('guild_configs').findOne({ guild_id: guildId });
}

// ============================================
// CHANNEL & ROLE FUNCTIONS
// ============================================

async function setGuildChannel(guildId, channelType, channelId) {
    if (!db) return;
    await db.collection('guild_channels').updateOne(
        { guild_id: guildId, channel_type: channelType },
        { $set: { channel_id: channelId, created_at: new Date() } },
        { upsert: true }
    );
}

async function getGuildChannels(guildId) {
    if (!db) return {};
    const channels = await db.collection('guild_channels').find({ guild_id: guildId }).toArray();
    return channels.reduce((acc, ch) => {
        acc[ch.channel_type] = ch.channel_id;
        return acc;
    }, {});
}



async function setGuildRole(guildId, roleType, roleId) {
    if (!db) return;
    await db.collection('guild_roles').updateOne(
        { guild_id: guildId, role_type: roleType },
        { $set: { role_id: roleId, created_at: new Date() } },
        { upsert: true }
    );
}

async function getGuildRoles(guildId) {
    if (!db) return {};
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
    if (!db) return null;
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
    if (!db) return [];
    return await db.collection('leagues').find({ guild_id: guildId, is_active: true }).sort({ created_at: 1 }).toArray();
}

async function getLeagueByAbbr(guildId, leagueAbbr) {
    if (!db) return null;
    return await db.collection('leagues').findOne({ guild_id: guildId, league_abbr: leagueAbbr.toUpperCase() });
}

async function getGuildLeagues(guildId) {
    if (!db) return [];
    return await db.collection('leagues').find({ guild_id: guildId }).toArray();
}

// ============================================
// USER FUNCTIONS
// ============================================

async function createOrUpdateUser(userId, username, customColor = null) {
    if (!db) return null;
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
    if (!db) return;
    await db.collection('users').updateOne(
        { user_id: userId },
        { $set: { custom_color: color, updated_at: new Date() } }
    );
}

// ============================================
// AWARDS & RINGS FUNCTIONS
// ============================================

async function addChampionshipRing(guildId, leagueId, userId, season, opponent, awardedBy) {
    if (!db) return null;
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
    if (!db) return null;

    if (!guildId || !leagueId || !userId || !awardName || !season) {
        return null;
    }

    try {
        const award = {
            guild_id: String(guildId),
            league_id: String(leagueId),
            user_id: String(userId),
            award_name: String(awardName),
            season: String(season),
            awarded_by: String(awardedBy),
            awarded_at: new Date()
        };

        const result = await db.collection('awards').insertOne(award);
        return { ...award, _id: result.insertedId };
    } catch (error) {
        if (error.code === 11000) return null;
        throw error;
    }
}

async function getUserAwards(guildId, userId) {
    if (!db) return null;
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
    if (!db) return null;
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
    if (!db) return [];
    return await db.collection('lineups').find({ guild_id: guildId }).sort({ created_at: 1 }).toArray();
}

async function getLineup(guildId, lineupName) {
    if (!db) return null;
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
    if (!db) return null;
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

async function addContract(guildId, userId, position, amount, due, terms, paid, messageId, createdBy) {
    if (!db) return null;
    
    const contract = {
        guildId,
        userId,
        position,
        amount,
        due,
        terms,
        paid,
        messageId,
        createdBy,
        createdAt: new Date()
    };

    const result = await db.collection('contracts').insertOne(contract);
    return { ...contract, _id: result.insertedId };
}

async function getPlayerContract(guildId, userId) {
    if (!db) return null;
    return await db.collection('contracts').findOne({ guildId, userId });
}

async function getAllContracts(guildId) {
    if (!db) return [];
    return await db.collection('contracts').find({ guildId }).toArray();
}

async function removeContract(guildId, userId) {
    if (!db) return false;
    const result = await db.collection('contracts').deleteOne({ guildId, userId });
    return result.deletedCount > 0;
}

async function markContractPaid(guildId, userId, paid = true) {
    if (!db) return false;
    
    await db.collection('contracts').updateOne(
        { guildId, userId },
        { 
            $set: { 
                paid,
                paidAt: paid ? new Date() : null
            } 
        }
    );

    return true;
}

async function getContractByMessageId(messageId) {
    if (!db) return null;
    return await db.collection('contracts').findOne({ messageId });
}

async function removePlayerFromLineup(lineupId, userId) {
    if (!db) return;
    const lineup = await db.collection('lineups').findOne({ _id: new ObjectId(lineupId) });
    if (!lineup) throw new Error('Lineup not found');
    
    const players = lineup.players.filter(p => p.user_id !== userId);
    
    await db.collection('lineups').updateOne(
        { _id: new ObjectId(lineupId) },
        { $set: { players: players, updated_at: new Date() } }
    );
}

async function deleteLineup(guildId, lineupName) {
    if (!db) return;
    await db.collection('lineups').deleteOne({ guild_id: guildId, lineup_name: lineupName });
}

// ============================================
// GAMETIME FUNCTIONS
// ============================================

async function createGametime(guildId, league, gameTime, createdAt, messageId, channelId, pingRoleId, createdBy) {
    if (!db) return null;
    const gametime = {
        guild_id: guildId,
        league: league,  // ADD THIS LINE
        game_time: gameTime,
        message_id: messageId,
        channel_id: channelId,
        ping_role_id: pingRoleId,
        created_by: createdBy,
        is_active: true,
        responses: [],
        created_at: createdAt
    };
    
    const result = await db.collection('gametimes').insertOne(gametime);
    return { ...gametime, _id: result.insertedId };
}

async function recordAttendance(gametimeId, userId, response) {
    if (!db) return;
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
    if (!db) return [];
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

async function getGametimeByMessageId(messageId) {
    if (!db) return null;
    return await db.collection('gametimes').findOne({ message_id: messageId });
}

// ============================================
// ACTIVITY CHECK FUNCTIONS
// ============================================

async function createActivityCheck(guildId, messageId, channelId, expiresAt, createdBy) {
    if (!db) return null;
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
    if (!db) return;
    await db.collection('activity_checks').updateOne(
        { _id: new ObjectId(activityCheckId) },
        { $addToSet: { responses: { user_id: userId, responded_at: new Date() } } }
    );
}

// ============================================
// SUGGESTION FUNCTIONS
// ============================================

async function createSuggestion(guildId, userId, suggestionText) {
    if (!db) return null;
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
    if (!db) return;
    await db.collection('command_usage').insertOne({
        command_name: commandName,
        guild_id: guildId,
        user_id: userId,
        used_at: new Date()
    });
}

async function getBotStats() {
    if (!db) return { total_guilds: 0, total_users: 0, total_commands_used: 0, premium_guilds: 0 };
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
    if (!db) return;
    await db.collection('guilds').updateOne(
        { guild_id: guildId },
        { $set: { premium: isPremium, premium_expires_at: expiresAt } }
    );
}

// ================================
// GAMETIME RSVP SYSTEM
// ================================

async function createGametimeRSVP(data) {
    if (!db) return null;
    await db.collection('gametime_rsvps').insertOne({
        ...data,
        created_at: new Date()
    });
}

async function getGametimeRSVP(messageId) {
    if (!db) return null;
    return await db.collection('gametime_rsvps').findOne({ messageId });
}

async function updateGametimeRSVP(messageId, update) {
    if (!db) return;
    await db.collection('gametime_rsvps').updateOne(
        { messageId },
        { $set: update }
    );
}

// ============================================
// DEPTH CHART FUNCTIONS
// ============================================

async function createDepthChart(guildId, name, abbreviation) {
    if (!db) return null;
    
    const depthChartData = {
        guildId,
        name,
        abbreviation: abbreviation.toUpperCase(),
        players: [], // Array of {userId, addedAt}
        createdAt: new Date()
    };

    const result = await db.collection('depth_charts').insertOne(depthChartData);
    return { ...depthChartData, _id: result.insertedId };
}

async function getDepthChart(guildId, abbreviation) {
    if (!db) return null;
    return await db.collection('depth_charts').findOne({ 
        guildId, 
        abbreviation: abbreviation.toUpperCase() 
    });
}

async function getAllDepthCharts(guildId) {
    if (!db) return [];
    return await db.collection('depth_charts').find({ guildId }).toArray();
}

async function deleteDepthChart(guildId, abbreviation) {
    if (!db) return false;
    const result = await db.collection('depth_charts').deleteOne({ 
        guildId, 
        abbreviation: abbreviation.toUpperCase() 
    });
    return result.deletedCount > 0;
}

async function addPlayerToDepthChart(guildId, abbreviation, userId) {
    if (!db) return false;
    
    await db.collection('depth_charts').updateOne(
        { guildId, abbreviation: abbreviation.toUpperCase() },
        { 
            $push: { 
                players: {
                    userId,
                    addedAt: new Date()
                }
            } 
        }
    );

    return true;
}

async function removePlayerFromDepthChart(guildId, abbreviation, userId) {
    if (!db) return false;
    
    await db.collection('depth_charts').updateOne(
        { guildId, abbreviation: abbreviation.toUpperCase() },
        { 
            $pull: { 
                players: { userId } 
            } 
        }
    );

    return true;
}

async function swapDepthChartPlayers(guildId, abbreviation, index1, index2) {
    if (!db) return false;
    
    // Get current depth chart
    const depthChart = await db.collection('depth_charts').findOne({ 
        guildId, 
        abbreviation: abbreviation.toUpperCase() 
    });

    if (!depthChart || !depthChart.players) {
        throw new Error('Depth chart not found');
    }

    // Swap players in array
    const players = [...depthChart.players];
    [players[index1], players[index2]] = [players[index2], players[index1]];

    // Update database
    await db.collection('depth_charts').updateOne(
        { guildId, abbreviation: abbreviation.toUpperCase() },
        { $set: { players } }
    );

    return true;
}

module.exports = {
    initialize,
    
    // Guild
    createGuild,
    getGuild,
    updateGuildSetup,
    getGuildPreferences,
    setGuildPreferences,
    getGuildConfig,
    
    // Channels & Roles
    setGuildChannel,
    getGuildChannels,
    setGuildRole,
    getGuildRoles,
    
    // Leagues
    createLeague,
    getLeagues,
    getLeagueByAbbr,
    getGuildLeagues,
    
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
    getGametimeByMessageId,
    
    // Activity Checks
    createActivityCheck,
    recordActivityResponse,
    
    // Suggestions
    createSuggestion,
    
    // Stats
    logCommand,
    getBotStats,
    setPremium,

    // Gametime RSVP
    createGametimeRSVP,
    getGametimeRSVP,
    updateGametimeRSVP,

    // Depth Charts
    createDepthChart,
    getDepthChart,
    getAllDepthCharts,
    deleteDepthChart,
    addPlayerToDepthChart,
    removePlayerFromDepthChart,
    swapDepthChartPlayers,

    // Contracts
    addContract,
    getPlayerContract,
    getAllContracts,
    removeContract,
    markContractPaid,
    getContractByMessageId
};