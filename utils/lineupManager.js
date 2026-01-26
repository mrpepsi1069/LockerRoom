// utils/lineupManager.js - Lineup CRUD operations helpers
const db = require('../database');

async function validateLineupExists(guildId, lineupName) {
    const lineup = await db.getLineup(guildId, lineupName);
    return lineup !== null;
}

async function getPlayerPosition(lineup, userId) {
    if (!lineup.players || lineup.players.length === 0) return null;
    const player = lineup.players.find(p => p.user_id === userId);
    return player ? player.position : null;
}

function formatLineupPlayers(players) {
    if (!players || players.length === 0) {
        return 'No players added yet.';
    }
    
    return players.map(p => `**${p.position}:** <@${p.user_id}>`).join('\n');
}

function sortPlayersByPosition(players) {
    // Position order for your league
    const positionOrder = {
        // Offense
        'qb': 1,
        'ol': 2,
        'te': 3,
        'streak': 4,
        'fold': 5,
        'los': 6,
        
        // Defense
        'short': 7,
        'deep': 8,
        'mlb': 9,
        'de': 10,
        'fs': 11,
        
        // Other
        'flex': 12,
        'sub': 13,
        'backup': 13,
        'coach': 14,
        'manager': 15
    };
    
    return players.sort((a, b) => {
        const aOrder = positionOrder[a.position.toLowerCase()] || 99;
        const bOrder = positionOrder[b.position.toLowerCase()] || 99;
        return aOrder - bOrder;
    });
}

async function getLineupPlayerCount(guildId, lineupName) {
    const lineup = await db.getLineup(guildId, lineupName);
    return lineup && lineup.players ? lineup.players.length : 0;
}

function isLineupFull(lineup, maxPlayers = 15) {
    return lineup.players && lineup.players.length >= maxPlayers;
}

module.exports = {
    validateLineupExists,
    getPlayerPosition,
    formatLineupPlayers,
    sortPlayersByPosition,
    getLineupPlayerCount,
    isLineupFull
};