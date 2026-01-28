// utils/embeds.js
const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

/* ---------- SAFE COLOR FALLBACKS ---------- */
const COLORS = {
    primary: config?.colors?.primary || 0x5865F2,
    success: config?.colors?.success || 0x57F287,
    error: config?.colors?.error || 0xED4245,
    warning: config?.colors?.warning || 0xFEE75C
};

/* ---------- Base Embed ---------- */
function createEmbed(title, description, color = COLORS.primary) {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();
}

/* ---------- Status Embeds ---------- */
const successEmbed = (t, d) => createEmbed(t, d, COLORS.success);
const errorEmbed   = (t, d) => createEmbed(t, d, COLORS.error);
const warningEmbed = (t, d) => createEmbed(t, d, COLORS.warning);

/* ---------- Setup ---------- */
function setupEmbed() {
    return new EmbedBuilder()
        .setTitle('🔧 LockerRoom Bot Setup')
        .setDescription('Follow the steps below to configure your server.')
        .setColor(COLORS.primary);
}

function setupCompleteEmbed() {
    return new EmbedBuilder()
        .setTitle('✅ Setup Complete')
        .setDescription('Your server is ready to go!')
        .setColor(COLORS.success)
        .setTimestamp();
}

/* ---------- Lineups ---------- */
function lineupEmbed(lineup) {
    const embed = new EmbedBuilder()
        .setTitle(`📋 ${lineup.lineup_name}`)
        .setColor(COLORS.primary)
        .setTimestamp();

    if (lineup.description) embed.setDescription(lineup.description);

    embed.addFields({
        name: 'Players',
        value: lineup.players?.length
            ? lineup.players.map(p => `**${p.position}:** <@${p.user_id}>`).join('\n')
            : 'No players added yet.'
    });

    return embed;
}

/* ---------- Gametime ---------- */
function gametimeEmbed(league, gameTime, role) {
    return new EmbedBuilder()
        .setTitle(`🎮 ${league} Game Time`)
        .setDescription(`**Time:** <t:${Math.floor(gameTime.getTime() / 1000)}:F>`)
        .setColor(COLORS.primary)
        .setFooter({ text: `Pinging: @${role}` })
        .setTimestamp();
}

/* ---------- Awards ---------- */
function awardsEmbed(user, awards) {
    const embed = new EmbedBuilder()
        .setTitle(`🏆 ${user.username}'s Awards`)
        .setColor(COLORS.primary)
        .setTimestamp();

    if (!awards?.rings?.length && !awards?.awards?.length) {
        embed.setDescription('No awards yet.');
        return embed;
    }

    if (awards.rings?.length) {
        embed.addFields({
            name: 'Rings',
            value: awards.rings.map(r => `💍 ${r.league} ${r.season}`).join('\n')
        });
    }

    if (awards.awards?.length) {
        embed.addFields({
            name: 'Awards',
            value: awards.awards.map(a => `🏆 ${a.award}`).join('\n')
        });
    }

    return embed;
}

/* ---------- HELP (CRASH-PROOF) ---------- */
function helpEmbed() {
    return new EmbedBuilder()
        .setTitle('🤖 LockerRoom Commands')
        .setDescription('Team management & league tools')
        .addFields(
            {
                name: '👥 Public',
                value:
                    '`/help`\n`/invite`\n`/color`\n`/awardcheck`\n`/flipcoin`\n`/ping`'
            },
            {
                name: '👮 Staff',
                value:
                    '`/mutevc`\n`/unmutevc`\n`/dmtcmembers`'
            },
            {
                name: '👑 Manager',
                value:
                    '`/gametime`\n`/league-add`\n`/lineup`\n`/lineups`\n`/activitycheck`'
            },
            {
                name: '🔧 Admin',
                value:
                    '`/setup`\n`/change-botname`\n`/change-pfp`\n`/change-description`'
            }
        )
        .setColor(COLORS.primary)
        .setFooter({ text: 'LockerRoom Bot • By Ghostie' })
        .setTimestamp();
}

/* ---------- Exports ---------- */
module.exports = {
    createEmbed,
    successEmbed,
    errorEmbed,
    warningEmbed,
    setupEmbed,
    setupCompleteEmbed,
    lineupEmbed,
    gametimeEmbed,
    awardsEmbed,
    helpEmbed
};