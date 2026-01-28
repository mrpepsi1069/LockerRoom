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
        .setTitle('🤖 LockerRoom Bot Commands')
        .setDescription('Team chat bot for league teams')
        .addFields(
            {
                name: '👥 Public Commands',
                value:
                    '`/help` - Display this menu\n' +
                    '`/invite` - Get bot invite\n' +
                    '`/awardcheck` - View self awards\n' +
                    '`/suggest` - Submit suggestion\n' +
                    '`/flipcoin` - Flip a coin\n' +
                    '`/bold` - Boldify text\n' +
                    '`/fban` - Fake ban\n' +
                    '`/fkick` - Fake kick\n' +
                    '`/ping` - Check bot latency'
            },
            {
                name: '👮 Staff Commands',
                value:
                    '`/mutevc` - Mute voice channel\n' +
                    '`/unmutevc` - Unmute voice channel\n' +
                    '`/help` - List commands\n' +
                    '`/dmtcmembers` - DM members with custom message (Premium)'
            },
            {
                name: '👑 Manager Commands',
                value:
                    '`/gametime` - Create game time poll (times like 8 PM EST, 9 PM EST — DM players with Premium)\n' +
                    '`/times` - Multiple time options\n' +
                    '`/league-add` - Post recruitment\n' +
                    '`/ring-add` - Grant rings\n' +
                    '`/award` - Give awards\n' +
                    '`/lineup` - Manage lineups (existing lineups selectable)\n' +
                    '`/lineups` - View all lineups\n' +
                    '`/activitycheck` - Set activity check'
            },
            {
                name: '🔧 Admin Commands',
                value:
                    '`/setup` - Configure bot\n' +
                    '`/change-pfp` - Change bot picture (Premium)\n' +
                    '`/change-botname` - Change bot name (Premium)\n' +
                    '`/change-description` - Change bot description (Premium)\n\n' +
                    '**Bot Owner**\n' +
                    '`/add-premium` - Add Premium to a guild with guild ID\n' +
                    '`/revoke-premium` - Revoke Premium from a guild with guild ID\n' +
                    '`/guilds` - View all guilds and invite links'
            }
        )
        .setColor(0x5865F2) // Discord blurple (safe fallback)
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