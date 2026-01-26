// database.js - PostgreSQL connection and query functions
// database.js - PostgreSQL connection and query functions
const { Pool } = require('pg'); // ✅ REQUIRED
const { MongoClient } = require('mongodb'); // ✅ kept (unused but not removed)

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false
});

// Test connection
async function initialize() {
    try {
        const client = await pool.connect();
        console.log('✅ Database connected successfully');
        client.release();
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        process.exit(1);
    }
}

// ============================================
// GUILD FUNCTIONS
// ============================================

async function createGuild(guildId, guildName) {
    const query = `
        INSERT INTO guilds (guild_id, guild_name)
        VALUES ($1, $2)
        ON CONFLICT (guild_id) DO UPDATE SET guild_name = $2
        RETURNING *
    `;
    const result = await pool.query(query, [guildId, guildName]);
    return result.rows[0];
}

async function getGuild(guildId) {
    const query = 'SELECT * FROM guilds WHERE guild_id = $1';
    const result = await pool.query(query, [guildId]);
    return result.rows[0];
}

async function updateGuildSetup(guildId, completed) {
    const query = 'UPDATE guilds SET setup_completed = $1, updated_at = CURRENT_TIMESTAMP WHERE guild_id = $2';
    await pool.query(query, [completed, guildId]);
}

async function getGuildPreferences(guildId) {
    const query = 'SELECT * FROM guild_preferences WHERE guild_id = $1';
    const result = await pool.query(query, [guildId]);
    return result.rows[0];
}

async function setGuildPreferences(guildId, preferences) {
    const query = `
        INSERT INTO guild_preferences (guild_id, auto_dm_gametimes, require_attendance_reactions, 
                                       activity_check_interval, gametime_reminder_minutes, bot_color)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (guild_id) DO UPDATE SET
            auto_dm_gametimes = $2,
            require_attendance_reactions = $3,
            activity_check_interval = $4,
            gametime_reminder_minutes = $5,
            bot_color = $6,
            updated_at = CURRENT_TIMESTAMP
    `;
    await pool.query(query, [
        guildId,
        preferences.auto_dm_gametimes,
        preferences.require_attendance_reactions,
        preferences.activity_check_interval,
        preferences.gametime_reminder_minutes,
        preferences.bot_color
    ]);
}

// ============================================
// CHANNEL & ROLE FUNCTIONS
// ============================================

async function setGuildChannel(guildId, channelType, channelId) {
    const query = `
        INSERT INTO guild_channels (guild_id, channel_type, channel_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (guild_id, channel_type) DO UPDATE SET channel_id = $3
    `;
    await pool.query(query, [guildId, channelType, channelId]);
}

async function getGuildChannels(guildId) {
    const query = 'SELECT channel_type, channel_id FROM guild_channels WHERE guild_id = $1';
    const result = await pool.query(query, [guildId]);
    return result.rows.reduce((acc, row) => {
        acc[row.channel_type] = row.channel_id;
        return acc;
    }, {});
}

async function setGuildRole(guildId, roleType, roleId) {
    const query = `
        INSERT INTO guild_roles (guild_id, role_type, role_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (guild_id, role_type) DO UPDATE SET role_id = $3
    `;
    await pool.query(query, [guildId, roleType, roleId]);
}

async function getGuildRoles(guildId) {
    const query = 'SELECT role_type, role_id FROM guild_roles WHERE guild_id = $1';
    const result = await pool.query(query, [guildId]);
    return result.rows.reduce((acc, row) => {
        acc[row.role_type] = row.role_id;
        return acc;
    }, {});
}

// ============================================
// LEAGUE FUNCTIONS
// ============================================

async function createLeague(guildId, leagueName, leagueAbbr, signupLink = null) {
    const query = `
        INSERT INTO leagues (guild_id, league_name, league_abbr, signup_link)
        VALUES ($1, $2, $3, $4)
        RETURNING *
    `;
    const result = await pool.query(query, [guildId, leagueName, leagueAbbr, signupLink]);
    return result.rows[0];
}

async function getLeagues(guildId) {
    const query = 'SELECT * FROM leagues WHERE guild_id = $1 AND is_active = true ORDER BY created_at';
    const result = await pool.query(query, [guildId]);
    return result.rows;
}

async function getLeagueByAbbr(guildId, leagueAbbr) {
    const query = 'SELECT * FROM leagues WHERE guild_id = $1 AND league_abbr = $2';
    const result = await pool.query(query, [guildId, leagueAbbr]);
    return result.rows[0];
}

// ============================================
// USER FUNCTIONS
// ============================================

async function createOrUpdateUser(userId, username, customColor = null) {
    const query = `
        INSERT INTO users (user_id, username, custom_color)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id) DO UPDATE SET 
            username = $2,
            custom_color = COALESCE($3, users.custom_color),
            updated_at = CURRENT_TIMESTAMP
        RETURNING *
    `;
    const result = await pool.query(query, [userId, username, customColor]);
    return result.rows[0];
}

async function setUserColor(userId, color) {
    const query = 'UPDATE users SET custom_color = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2';
    await pool.query(query, [color, userId]);
}

// ============================================
// AWARDS & RINGS FUNCTIONS
// ============================================

async function addChampionshipRing(guildId, leagueId, userId, season, opponent, awardedBy) {
    const query = `
        INSERT INTO championship_rings (guild_id, league_id, user_id, season, opponent, awarded_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (guild_id, league_id, user_id, season) DO NOTHING
        RETURNING *
    `;
    const result = await pool.query(query, [guildId, leagueId, userId, season, opponent, awardedBy]);
    return result.rows[0];
}

async function addAward(guildId, leagueId, userId, awardName, season, awardedBy) {
    const query = `
        INSERT INTO awards (guild_id, league_id, user_id, award_name, season, awarded_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (guild_id, league_id, user_id, award_name, season) DO NOTHING
        RETURNING *
    `;
    const result = await pool.query(query, [guildId, leagueId, userId, awardName, season, awardedBy]);
    return result.rows[0];
}

async function getUserAwards(guildId, userId) {
    const query = `
        SELECT 
            u.username,
            COALESCE(json_agg(DISTINCT jsonb_build_object(
                'league', l.league_name,
                'season', cr.season,
                'opponent', cr.opponent
            )) FILTER (WHERE cr.id IS NOT NULL), '[]') as rings,
            COALESCE(json_agg(DISTINCT jsonb_build_object(
                'league', l2.league_name,
                'award', a.award_name,
                'season', a.season
            )) FILTER (WHERE a.id IS NOT NULL), '[]') as awards
        FROM users u
        LEFT JOIN championship_rings cr ON u.user_id = cr.user_id AND cr.guild_id = $1
        LEFT JOIN leagues l ON cr.league_id = l.id
        LEFT JOIN awards a ON u.user_id = a.user_id AND a.guild_id = $1
        LEFT JOIN leagues l2 ON a.league_id = l2.id
        WHERE u.user_id = $2
        GROUP BY u.user_id, u.username
    `;
    const result = await pool.query(query, [guildId, userId]);
    return result.rows[0];
}

// ============================================
// LINEUP FUNCTIONS
// ============================================

async function createLineup(guildId, lineupName, description, createdBy) {
    const query = `
        INSERT INTO lineups (guild_id, lineup_name, description, created_by)
        VALUES ($1, $2, $3, $4)
        RETURNING *
    `;
    const result = await pool.query(query, [guildId, lineupName, description, createdBy]);
    return result.rows[0];
}

async function getLineups(guildId) {
    const query = 'SELECT * FROM lineups WHERE guild_id = $1 ORDER BY created_at';
    const result = await pool.query(query, [guildId]);
    return result.rows;
}

async function getLineup(guildId, lineupName) {
    const query = `
        SELECT 
            l.id,
            l.lineup_name,
            l.description,
            l.created_at,
            COALESCE(json_agg(jsonb_build_object(
                'user_id', lp.user_id,
                'username', u.username,
                'position', lp.position
            )) FILTER (WHERE lp.id IS NOT NULL), '[]') as players
        FROM lineups l
        LEFT JOIN lineup_players lp ON l.id = lp.lineup_id
        LEFT JOIN users u ON lp.user_id = u.user_id
        WHERE l.guild_id = $1 AND l.lineup_name = $2
        GROUP BY l.id
    `;
    const result = await pool.query(query, [guildId, lineupName]);
    return result.rows[0];
}

async function addPlayerToLineup(lineupId, userId, position) {
    const query = `
        INSERT INTO lineup_players (lineup_id, user_id, position)
        VALUES ($1, $2, $3)
        ON CONFLICT (lineup_id, user_id) DO UPDATE SET position = $3
        RETURNING *
    `;
    const result = await pool.query(query, [lineupId, userId, position]);
    return result.rows[0];
}

async function removePlayerFromLineup(lineupId, userId) {
    const query = 'DELETE FROM lineup_players WHERE lineup_id = $1 AND user_id = $2';
    await pool.query(query, [lineupId, userId]);
}

async function deleteLineup(guildId, lineupName) {
    const query = 'DELETE FROM lineups WHERE guild_id = $1 AND lineup_name = $2';
    await pool.query(query, [guildId, lineupName]);
}

// ============================================
// GAMETIME FUNCTIONS
// ============================================

async function createGametime(guildId, leagueId, gameTime, messageId, channelId, pingRoleId, createdBy) {
    const query = `
        INSERT INTO gametimes (guild_id, league_id, game_time, message_id, channel_id, ping_role_id, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
    `;
    const result = await pool.query(query, [guildId, leagueId, gameTime, messageId, channelId, pingRoleId, createdBy]);
    return result.rows[0];
}

async function recordAttendance(gametimeId, userId, response) {
    const query = `
        INSERT INTO gametime_responses (gametime_id, user_id, response)
        VALUES ($1, $2, $3)
        ON CONFLICT (gametime_id, user_id) DO UPDATE SET response = $3, responded_at = CURRENT_TIMESTAMP
    `;
    await pool.query(query, [gametimeId, userId, response]);
}

async function getGametimeAttendance(gametimeId) {
    const query = `
        SELECT gr.response, u.username, u.user_id
        FROM gametime_responses gr
        JOIN users u ON gr.user_id = u.user_id
        WHERE gr.gametime_id = $1
        ORDER BY gr.responded_at
    `;
    const result = await pool.query(query, [gametimeId]);
    return result.rows;
}

// ============================================
// ACTIVITY CHECK FUNCTIONS
// ============================================

async function createActivityCheck(guildId, messageId, channelId, expiresAt, createdBy) {
    const query = `
        INSERT INTO activity_checks (guild_id, message_id, channel_id, expires_at, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
    `;
    const result = await pool.query(query, [guildId, messageId, channelId, expiresAt, createdBy]);
    return result.rows[0];
}

async function recordActivityResponse(activityCheckId, userId) {
    const query = `
        INSERT INTO activity_check_responses (activity_check_id, user_id)
        VALUES ($1, $2)
        ON CONFLICT (activity_check_id, user_id) DO NOTHING
    `;
    await pool.query(query, [activityCheckId, userId]);
}

// ============================================
// SUGGESTION FUNCTIONS
// ============================================

async function createSuggestion(guildId, userId, suggestionText) {
    const query = `
        INSERT INTO suggestions (guild_id, user_id, suggestion_text)
        VALUES ($1, $2, $3)
        RETURNING *
    `;
    const result = await pool.query(query, [guildId, userId, suggestionText]);
    return result.rows[0];
}

// ============================================
// STATS & LOGGING
// ============================================

async function logCommand(commandName, guildId, userId) {
    const query = 'INSERT INTO command_usage (command_name, guild_id, user_id) VALUES ($1, $2, $3)';
    await pool.query(query, [commandName, guildId, userId]);
}

async function getBotStats() {
    const query = `
        SELECT 
            (SELECT COUNT(*) FROM guilds) as total_guilds,
            (SELECT COUNT(*) FROM users) as total_users,
            (SELECT COUNT(*) FROM command_usage) as total_commands_used,
            (SELECT COUNT(*) FROM guilds WHERE premium = true) as premium_guilds
    `;
    const result = await pool.query(query);
    return result.rows[0];
}

async function setPremium(guildId, isPremium, expiresAt = null) {
    const query = 'UPDATE guilds SET premium = $1, premium_expires_at = $2 WHERE guild_id = $3';
    await pool.query(query, [isPremium, expiresAt, guildId]);
}

module.exports = {
    initialize,
    pool,
    
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