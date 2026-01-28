// utils/embeds.js
const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

/* ---------- Base Embed ---------- */
function createEmbed(title, description, color = config.colors.primary) {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();
}

/* ---------- Status Embeds ---------- */
function successEmbed(title, description) {
    return createEmbed(title, description, config.colors.success);
}

function errorEmbed(title, description) {
    return createEmbed(title, description, config.colors.error);
}

function warningEmbed(title, description) {
    return createEmbed(title, description, config.colors.warning);
}

/* ---------- Setup Embeds ---------- */
function setupEmbed() {
    return new EmbedBuilder()
        .setTitle('🔧 LockerRoom Bot Setup Wizard')
        .setDescription(
            'This will guide you through configuring the bot for your server.\n' +
            'You can always reconfigure later using `/setup`.'
        )
        .setColor(config.colors.primary)
        .setFooter({ text: 'Click Continue to start setup' });
}

function setupCompleteEmbed() {
    return new EmbedBuilder()
        .setTitle('✅ Setup Complete!')
        .setDescription('Your LockerRoom Bot is ready to go!')
        .addFields(
            {
                name: 'Next Steps',
                value:
                    '• Use `/league-add` to post recruitment\n' +
                    '• Use `/lineup create` to build your roster\n' +
                    '• Use `/gametime` to schedule your first match'
            },
            {
                name: 'Need Help?',
                value: 'Use `/help` anytime.'
            }
        )
        .setColor(config.colors.success)
        .setTimestamp();
}

/* ---------- Lineup Embed ---------- */
function lineupEmbed(lineup) {
    const embed = new EmbedBuilder()
        .setTitle(`📋 ${lineup.lineup_name}`)
        .setColor(config.colors.primary)
        .setTimestamp();

    if (lineup.description) {
        embed.setDescription(lineup.description);
    }

    if (lineup.players && lineup.players.length > 0) {
        embed.addFields({
            name: 'Players',
            value: lineup.players
                .map(p => `**${p.position}:** <@${p.user_id}>`)
                .join('\n')
        });
    } else {
        embed.addFields({ name: 'Players', value: 'No players added yet.' });
    }

    return embed;
}

/* ---------- Gametime Embed ---------- */
function gametimeEmbed(league, gameTime, role) {
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
        .setColor(config.colors.primary)
        .setFooter({ text: `Pinging: @${role}` })
        .setTimestamp();
}

/* ---------- Awards Embed ---------- */
function awardsEmbed(user, awards) {
    const embed = new EmbedBuilder()
        .setTitle(`${config.emojis.trophy} ${user.username}'s Awards`)
        .setColor(config.colors.primary)
        .setTimestamp();

    if (awards.rings?.length) {
        embed.addFields({
            name: 'Championship Rings',
            value: awards.rings
                .map(r =>
                    `${config.emojis.ring} **${r.league}** - ${r.season}` +
                    (r.opponent ? ` (vs ${r.opponent})` : '')
                )
                .join('\n')
        });
    }

    if (awards.awards?.length) {
        embed.addFields({
            name: 'Individual Awards',
            value: awards.awards
                .map(a =>
                    `${config.emojis.trophy} **${a.award}** - ${a.league} ${a.season}`
                )
                .join('\n')
        });
    }

    if (!awards.rings?.length && !awards.awards?.length) {
        embed.setDescription('No awards or rings yet. Keep grinding!');
    }

    return embed;
}

/* ---------- HELP EMBED (FINAL VERSION) ---------- */
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
                    '`/color` - Set custom name color\n' +
                    '`/awardcheck` - View player awards\n' +
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
                    '`/helptc` - TeamChat help\n' +
                    '`/dmtcmembers` - DM members'
            },
            {
                name: '👑 Manager Commands',
                value:
                    '`/gametime` - Create game time poll\n' +
                    '`/times` - Multiple time options\n' +
                    '`/league-add` - Post recruitment\n' +
                    '`/ring-add` - Grant rings\n' +
                    '`/award` - Give awards\n' +
                    '`/lineup` - Manage lineups\n' +
                    '`/lineups` - View all lineups\n' +
                    '`/activitycheck` - Set activity check'
            },
            {
                name: '🔧 Admin Commands',
                value:
                    '`/setup` - Configure bot\n' +
                    '`/change-pfp` - Change bot picture *(Premium)*\n' +
                    '`/change-botname` - Change bot name *(Premium)*\n' +
                    '`/change-description` - Change bot description *(Premium)*'
            },
            {
                name: '👑 Bot Owner',
                value:
                    '`/add-premium` - Add Premium to a guild\n' +
                    '`/revoke-premium` - Revoke Premium from a guild\n' +
                    '`/guilds` - View all guilds & invites'
            }
        )
        .setColor(config.colors.primary)
        .setFooter({ text: 'Use /purchase for Premium features • By Ghostie' })
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
