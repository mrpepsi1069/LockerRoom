// utils/embeds.js
const { EmbedBuilder } = require('discord.js');

const DEFAULT_COLOR = 0x5865F2; // Discord blurple

/* ---------- Base ---------- */
function createEmbed(title, description) {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(DEFAULT_COLOR)
        .setTimestamp();
}

/* ---------- Status ---------- */
function successEmbed(title, description) {
    return createEmbed(`✅ ${title}`, description);
}

function errorEmbed(title, description) {
    return createEmbed(`❌ ${title}`, description);
}

function warningEmbed(title, description) {
    return createEmbed(`⚠️ ${title}`, description);
}

/* ---------- Setup ---------- */
function setupEmbed() {
    return new EmbedBuilder()
        .setTitle('🔧 LockerRoom Bot Setup')
        .setDescription('Follow the steps below to configure your server.')
        .setColor(DEFAULT_COLOR)
        .setTimestamp();
}

function setupCompleteEmbed() {
    return new EmbedBuilder()
        .setTitle('✅ Setup Complete')
        .setDescription('Your server is ready to go!')
        .setColor(DEFAULT_COLOR)
        .setTimestamp();
}

/* ---------- Lineups ---------- */
function lineupEmbed(lineup) {
    const embed = new EmbedBuilder()
        .setTitle(`📋 ${lineup.lineup_name}`)
        .setColor(DEFAULT_COLOR)
        .setTimestamp();

    if (lineup.description) {
        embed.setDescription(lineup.description);
    }

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
        .setColor(DEFAULT_COLOR)
        .setFooter({ text: `Pinging: @${role}` })
        .setTimestamp();
}

/* ---------- Awards ---------- */
function awardsEmbed(user, awards) {
    const embed = new EmbedBuilder()
        .setTitle(`🏆 ${user.username}'s Awards`)
        .setColor(DEFAULT_COLOR)
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

/* ---------- Help ---------- */
function helpEmbed() {
    return new EmbedBuilder()
        .setTitle('🤖 LockerRoom Bot Commands')
        .setDescription('Team chat bot for league teams')
        .addFields(
            {
                name: '👥 Public Commands',
                value:
`/help - Display this menu
/invite - Get bot invite
/awardcheck - View self awards
/suggest - Submit suggestion
/flipcoin - Flip a coin
/randomnumber - Pick a random number from min to max
/bold - Boldify text
/fban - Fake ban
/fkick - Fake kick
/ping - Check bot latency`
            },
            {
                name: '👮 Staff Commands',
                value:
`/mutevc - Mute voice channel
/unmutevc - Unmute voice channel
/dmtcmembers - DM members with custom message (Premium)`
            },
            {
                name: '👑 Manager Commands',
                value:
`/gametime - Create game time poll (DMs players with Premium)
/times - Multiple time options
/league-add - Post recruitment
/league-delete - Remove a league
/ring-add - Grant rings
/award - Give awards
/lineup-create - Create a new lineup
/lineup-view - View a specific lineup
/lineup-edit - Edit a player position in a lineup
/lineup-delete - Delete a lineup
/lineup-add - Add a player to a lineup
/lineup-remove - Remove a player from a lineup
/lineup-post - Post a lineup to a channel
/lineups - View all lineups
/activitycheck - Set activity check`
            },
            {
                name: '🔧 Admin Commands',
                value:
`/setup - Configure bot
/role - Role a user a role
/unrole - Unrole a user a role
/adminkick - Kick a user
/adminban - ban a user
/change-pfp - (disabled) Change bot picture (Premium)
/change-botname - Change bot name (Premium)

Bot Owner (only accessed by ghostie):
/add-premium - Add Premium to a guild
/revoke-premium - Revoke Premium from a guild
/guilds - View all guilds and invite links`
            }
        )
        .setColor(DEFAULT_COLOR)
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
