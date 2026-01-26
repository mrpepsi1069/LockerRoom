// utils/awards.js - Award and ring management helpers
const config = require('../config.json');

function formatRingDisplay(ring) {
    return `${config.emojis.ring} **${ring.league}** - ${ring.season}${ring.opponent ? ` (vs ${ring.opponent})` : ''}`;
}

function formatAwardDisplay(award) {
    return `${config.emojis.trophy} **${award.award}** - ${award.league} ${award.season}`;
}

function countTotalRings(rings) {
    return rings ? rings.length : 0;
}

function countTotalAwards(awards) {
    return awards ? awards.length : 0;
}

function getRingsByLeague(rings) {
    if (!rings || rings.length === 0) return {};
    
    return rings.reduce((acc, ring) => {
        if (!acc[ring.league]) {
            acc[ring.league] = [];
        }
        acc[ring.league].push(ring);
        return acc;
    }, {});
}

function getAwardsByLeague(awards) {
    if (!awards || awards.length === 0) return {};
    
    return awards.reduce((acc, award) => {
        if (!acc[award.league]) {
            acc[award.league] = [];
        }
        acc[award.league].push(award);
        return acc;
    }, {});
}

function generateAwardSummary(rings, awards) {
    const totalRings = countTotalRings(rings);
    const totalAwards = countTotalAwards(awards);
    
    if (totalRings === 0 && totalAwards === 0) {
        return 'No awards or rings yet. Keep grinding!';
    }
    
    let summary = '';
    
    if (totalRings > 0) {
        summary += `${config.emojis.ring} **${totalRings}** Championship Ring${totalRings > 1 ? 's' : ''}`;
    }
    
    if (totalAwards > 0) {
        if (summary) summary += '\n';
        summary += `${config.emojis.trophy} **${totalAwards}** Individual Award${totalAwards > 1 ? 's' : ''}`;
    }
    
    return summary;
}

module.exports = {
    formatRingDisplay,
    formatAwardDisplay,
    countTotalRings,
    countTotalAwards,
    getRingsByLeague,
    getAwardsByLeague,
    generateAwardSummary
};