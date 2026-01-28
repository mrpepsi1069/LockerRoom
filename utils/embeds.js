// utils/embeds.js
const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

// Fallbacks so embeds never crash
const COLORS = {
    primary: config.colors?.primary || 0x2B2D31,
    success: config.colors?.success || 0x57F287,
    error: config.colors?.error || 0xED4245,
    warning: config.colors?.warning || 0xFEE75C
};

const EMOJIS = {
    trophy: config.emojis?.trophy || '🏆',
    ring: config.emojis?.ring || '💍'
};

/* =========================
   Base Embed Builders
========================= */

function createEmbed(title, description, color = COLORS.primary) {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description || null)
        .setColor(color)
        .setTimestamp();
}

function successEmbed(title, description) {
    return createEmbed(title, description, COLORS.success);
}

function errorEmbed(title, description) {
    return createEmbed(title, description, COLORS.error);
}

function warningEmbed(title, description) {
    return createEmbed(title, description, COLORS.warning);
}

/* =========================
   Setup Embeds
========================= */

function setupEmbed() {
    return new EmbedBuilder()
        .setTitle('🔧 LockerRoom Bot Setup Wizard')
        .setDescription(
            'This wizard will help configure the bot for your server.\n\n' +
            'You can always rerun this later using `/setup`.'
        )
        .setColor(COLORS.primary)
        .setFooter({ text: 'Click Continue to start setup' });
}

function setupCompleteEmbed() {
    return new EmbedBuilder()
        .setTitle('✅ Setup Complete!')
        .setDescription('Your LockerRoom Bot is ready to go!')
        .addFields(
            {
                name: '🚀 Next Steps',
                value:
                    '• `/league-add` – Post recruitment\n' +
                    '• `/lineup create` – Build a roster\n' +
                    '• `/gametime` – Schedule a match'
            },
            {
                name: '❓ Need Help?',
                value: 'Use `/helptc` anytime.'
            }
        )
        .setColor(COLORS.success)
        .setTimestamp();
}

/* =========================
   Lineup Embeds
========================= */

function lineupEmbed(lineup) {
    const embed = new EmbedBuilder()
        .setTitle(`📋 ${lineup.lineup_name}`)
        .setColor(COLORS.primary)
        .setTimestamp();

    if (lineup.description) {
        embed.setDescription(lineup.description);
    }

    if (Array.isArray(lineup.players) && lineup.players.length > 0) {
        const playerList = lineup.players
            .map(p => `**${p.position}:** <@${p.user_id}>`)
            .join('\n');

        embed.addFields({
            name: '👥 Players',
            value: playerList
        });
    } else {
        embed.addFields({
            name: '👥 Players',
            value: 'No players added yet.'
        });
    }

    return embed;
}

/* =========================
   Gametime Embed
========================= */

function gametimeEmbed(league, gameTime, roleId) {
    return new EmbedBuilder()
        .setTitle(`🎮 ${league} Game Time`)
        .setDescription(
            `**Time:** <t:${Math.floor(gameTime.getTime() / 1000)}:F>\n\n` +
            'React below to confirm attendance!'
        )
        .addFields(
            { name: '✅ Attending', value: 'None yet', inline: true },
            { name: '❓ Maybe', value: 'None yet', inline: true },
            { name: '❌ Not Attending', value: 'None yet', inline: true }
        )
        .setColor(COLORS.primary)
        .setFooter({
            text: roleId ? `Pinging: <@&${roleId}>` : 'No role ping'
        })
        .setTimestamp();
}

/* =========================
   Awards Embed
========================= */

function awardsEmbed(user, awards) {
    const embed = new EmbedBuilder()
        .setTitle(`${EMOJIS.trophy} ${user.username}'s Awards`)
        .setColor(COLORS.primary)
        .setTimestamp();

    if (Array.isArray(awards?.rings) && awards.rings.length > 0) {
        const ringsList = awards.rings
            .map(r =>
                `${EMOJIS.ring} **${r.league}** – ${r.season}` +
                (r.opponent ? ` (vs ${r.opponent})` : '')
            )
            .join('\n');

        embed.addFields({
            name: '💍 Championship Rings',
            value: ringsList
        });
    }

    if (Array.isArray(awards?.awards) && awards.awards.length > 0) {
        const awardsList = awards.awards
            .map(a =>
                `${EMOJIS.trophy} **${a.award}** – ${a.league} ${a.season}`
            )
            .join('\n');

        embed.addFields({
            name: '🏆 Individual Awards',
            value: awardsList
        });
    }

    if (
        (!awards?.rings || awards.rings.length === 0) &&
        (!awards?.awards || awards.awards.length === 0)
    ) {
        embed.setDescription('No awards yet — keep grinding 💪');
    }

    return embed;
}

/* =========================
   Help Embed
========================= */

function helpEmbed() {
    return new EmbedBuilder()
        .setTitle('🤖 LockerRoom Bot Commands')
        .setDescription('Team & league management bot')
        .addFields(
            {
                name: '👥 Public Commands',
                value:
                    '`/help` – Help menu\n' +
                    '`/invite` – Bot invite\n' +
                    '`/color` – Name color\n' +
                    '`/awardcheck` – View awards\n' +
                    '`/suggest` – Submit suggestion\n' +
                    '`/flipcoin` – Flip coin\n' +
                    '`/bold` – Bold text\n' +
                    '`/fban` – Fake ban\n' +
                    '`/fkick` – Fake kick'
            },
            {
                name: '👮 Staff Commands',
                value:
                    '`/mutevc`\n' +
                    '`/unmutevc`\n' +
                    '`/helptc`\n' +
                    '`/dmtcmembers`'
            },
            {
                name: '👑 Manager Commands',
                value:
                    '`/gametime`\n' +
                    '`/times`\n' +
                    '`/league-add`\n' +
                    '`/ring-add`\n' +
                    '`/award`\n' +
                    '`/lineup`\n' +
                    '`/lineups`\n' +
                    '`/activitycheck`'
            },
            {
                name: '🔧 Admin Commands',
                value:
                    '`/setup`\n' +
                    '`/change-pfp` *(Premium)*'
            }
        )
        .setColor(COLORS.primary)
        .setFooter({ text: 'Use /purchase for Premium features' })
        .setTimestamp();
}

/* =========================
   Exports
========================= */

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