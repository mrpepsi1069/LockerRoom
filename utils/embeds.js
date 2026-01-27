// utils/embeds.js - Embed templates and builders
const { EmbedBuilder } = require('discord.js');

// Hardcoded colors (no config dependency)
const colors = {
    primary: '#5865F2',
    success: '#57F287',
    error: '#ED4245',
    warning: '#FEE75C'
};

const emojis = {
    ring: '💍',
    trophy: '🏆',
    check: '✅',
    cross: '❌'
};

function createEmbed(title, description, color = colors.primary) {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();
}

function successEmbed(title, description) {
    return createEmbed(title, description, colors.success);
}

function errorEmbed(title, description) {
    return createEmbed(title, description, colors.error);
}

function warningEmbed(title, description) {
    return createEmbed(title, description, colors.warning);
}

function setupEmbed() {
    return new EmbedBuilder()
        .setTitle('🔧 LockerRoom Bot Setup Wizard')
        .setDescription('This will guide you through configuring the bot for your server.\nYou can always reconfigure later using `/setup` again.')
        .setColor(colors.primary)
        .setFooter({ text: 'Click Continue to start setup' });
}

function setupCompleteEmbed() {
    return new EmbedBuilder()
        .setTitle('✅ Setup Complete!')
        .setDescription('Your LockerRoom Bot is ready to go!')
        .addFields(
            { name: 'Next Steps', value: '• Use `/league-add` to post recruitment\n• Use `/lineup create` to build your roster\n• Use `/gametime` to schedule your first match' },
            { name: 'Need Help?', value: 'Use `/helptc` anytime.' }
        )
        .setColor(colors.success)
        .setTimestamp();
}

function lineupEmbed(lineup) {
    const embed = new EmbedBuilder()
        .setTitle(`📋 ${lineup.lineup_name}`)
        .setColor(colors.primary)
        .setTimestamp();

    if (lineup.description) {
        embed.setDescription(lineup.description);
    }

    if (lineup.players && lineup.players.length > 0) {
        const playerList = lineup.players
            .map(p => `**${p.position}:** <@${p.user_id}>`)
            .join('\n');
        embed.addFields({ name: 'Players', value: playerList });
    } else {
        embed.addFields({ name: 'Players', value: 'No players added yet.' });
    }

    return embed;
}

function gametimeEmbed(league, gameTime, role) {
    return new EmbedBuilder()
        .setTitle(`🎮 ${league} Game Time`)
        .setDescription(`**Time:** <t:${Math.floor(gameTime.getTime() / 1000)}:F>\n\nReact below to confirm attendance!`)
        .addFields(
            { name: '✅ Attending', value: 'None yet', inline: true },
            { name: '❓ Maybe', value: 'None yet', inline: true },
            { name: '❌ Not Attending', value: 'None yet', inline: true }
        )
        .setColor(colors.primary)
        .setFooter({ text: `Pinging: @${role}` })
        .setTimestamp();
}

function awardsEmbed(user, awards) {
    const embed = new EmbedBuilder()
        .setTitle(`${emojis.trophy} ${user.username}'s Awards`)
        .setColor(colors.primary)
        .setTimestamp();

    // Championship Rings
    if (awards.rings && awards.rings.length > 0) {
        const ringsList = awards.rings
            .map(r => `${emojis.ring} **${r.league}** - ${r.season}${r.opponent ? ` (vs ${r.opponent})` : ''}`)
            .join('\n');
        embed.addFields({ name: 'Championship Rings', value: ringsList });
    }

    // Individual Awards
    if (awards.awards && awards.awards.length > 0) {
        const awardsList = awards.awards
            .map(a => `${emojis.trophy} **${a.award}** - ${a.league} ${a.season}`)
            .join('\n');
        embed.addFields({ name: 'Individual Awards', value: awardsList });
    }

    if ((!awards.rings || awards.rings.length === 0) && (!awards.awards || awards.awards.length === 0)) {
        embed.setDescription('No awards or rings yet. Keep grinding!');
    }

    return embed;
}

function helpEmbed() {
    return new EmbedBuilder()
        .setTitle('🤖 LockerRoom Bot Commands')
        .setDescription('Team chat bot for league teams')
        .addFields(
            { 
                name: '👥 Public Commands', 
                value: '`/help` - Display this menu\n`/invite` - Get bot invite\n`/color` - Set custom name color\n`/awardcheck` - View player awards\n`/suggest` - Submit suggestion\n`/flipcoin` - Flip a coin\n`/bold` - Boldify text\n`/fban` - Fake ban\n`/fkick` - Fake kick\n`/ping` - Check bot latency'
            },
            { 
                name: '👮 Staff Commands', 
                value: '`/mutevc` - Mute voice channel\n`/unmutevc` - Unmute voice channel\n`/helptc` - TeamChat help\n`/dmtcmembers` - DM members'
            },
            { 
                name: '👑 Manager Commands', 
                value: '`/gametime` - Create game time poll\n`/times` - Multiple time options\n`/league-add` - Post recruitment\n`/ring-add` - Grant rings\n`/award` - Give awards\n`/lineup` - Manage lineups\n`/lineups` - View all lineups\n`/activitycheck` - Set activity check'
            },
            { 
                name: '🔧 Admin Commands', 
                value: '`/setup` - Configure bot\n`/change-pfp` - Change bot picture (Premium)'
            }
        )
        .setColor(colors.primary)
        .setFooter({ text: 'Use /purchase for Premium features' })
        .setTimestamp();
}

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