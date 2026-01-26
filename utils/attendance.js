// utils/attendance.js - Game time attendance logic
const db = require('../database');

function groupAttendanceByResponse(attendanceList) {
    const grouped = {
        attending: [],
        maybe: [],
        not_attending: []
    };

    for (const record of attendanceList) {
        if (record.response === 'attending') {
            grouped.attending.push(record);
        } else if (record.response === 'maybe') {
            grouped.maybe.push(record);
        } else if (record.response === 'not_attending') {
            grouped.not_attending.push(record);
        }
    }

    return grouped;
}

function formatAttendanceEmbed(grouped) {
    const attending = grouped.attending.length > 0 
        ? grouped.attending.map(r => `<@${r.user_id}>`).join(', ')
        : 'None yet';
    
    const maybe = grouped.maybe.length > 0
        ? grouped.maybe.map(r => `<@${r.user_id}>`).join(', ')
        : 'None yet';
    
    const notAttending = grouped.not_attending.length > 0
        ? grouped.not_attending.map(r => `<@${r.user_id}>`).join(', ')
        : 'None yet';

    return {
        attending,
        maybe,
        notAttending,
        totalResponses: grouped.attending.length + grouped.maybe.length + grouped.not_attending.length
    };
}

async function updateGametimeMessage(interaction, gametimeId, embed) {
    const attendance = await db.getGametimeAttendance(gametimeId);
    const grouped = groupAttendanceByResponse(attendance);
    const formatted = formatAttendanceEmbed(grouped);

    // Update embed fields
    embed.data.fields[0].value = formatted.attending;
    embed.data.fields[1].value = formatted.maybe;
    embed.data.fields[2].value = formatted.notAttending;

    return embed;
}

module.exports = {
    groupAttendanceByResponse,
    formatAttendanceEmbed,
    updateGametimeMessage
};