// commands/ring-add.js
const { SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const { successEmbed, errorEmbed } = require('../utils/embeds');
const { hasManagerPerms } = require('../utils/permissions');
const { sanitizeInput, validateSeason } = require('../utils/validation');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ring-add')
        .setDescription('Grant championship rings to players')
        .addStringOption(option =>
            option.setName('league')
                .setDescription('League abbreviation')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('season')
                .setDescription('Season (e.g., S1, 2024)')
                .setRequired(true))
        .addUserOption(option =>
            option.setName('player1')
                .setDescription('Player 1')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('opponent')
                .setDescription('Who you beat in the finals')
                .setRequired(false))
        .addUserOption(option =>
            option.setName('player2')
                .setDescription('Player 2')
                .setRequired(false))
        .addUserOption(option =>
            option.setName('player3')
                .setDescription('Player 3')
                .setRequired(false))
        .addUserOption(option =>
            option.setName('player4')
                .setDescription('Player 4')
                .setRequired(false))
        .addUserOption(option =>
            option.setName('player5')
                .setDescription('Player 5')
                .setRequired(false))
        .addUserOption(option =>
            option.setName('player6')
                .setDescription('Player 6')
                .setRequired(false))
        .addUserOption(option =>
            option.setName('player7')
                .setDescription('Player 7')
                .setRequired(false))
        .addUserOption(option =>
            option.setName('player8')
                .setDescription('Player 8')
                .setRequired(false))
        .addUserOption(option =>
            option.setName('player9')
                .setDescription('Player 9')
                .setRequired(false))
        .addUserOption(option =>
            option.setName('player10')
                .setDescription('Player 10')
                .setRequired(false)),
    
    async execute(interaction) {
        // Check permissions
        if (!await hasManagerPerms(interaction)) {
            return interaction.reply({ 
                embeds: [errorEmbed('Permission Denied', 'You need Manager role or higher to use this command.')], 
                ephemeral: true 
            });
        }

        await interaction.deferReply({ ephemeral: true });

        const leagueAbbr = interaction.options.getString('league').toUpperCase();
        const season = sanitizeInput(interaction.options.getString('season'), 20);
        const opponent = sanitizeInput(interaction.options.getString('opponent'), 100);

        // Validate season
        if (!validateSeason(season)) {
            return interaction.editReply({
                embeds: [errorEmbed('Invalid Season', 'Season must be between 1-20 characters.')]
            });
        }

        // Get league
        const league = await db.getLeagueByAbbr(interaction.guildId, leagueAbbr);
        if (!league) {
            return interaction.editReply({
                embeds: [errorEmbed('League Not Found', `League with abbreviation **${leagueAbbr}** does not exist.\nUse \`/league-add\` to create it first.`)]
            });
        }

        // Collect all players
        const players = [];
        for (let i = 1; i <= 10; i++) {
            const player = interaction.options.getUser(`player${i}`);
            if (player) {
                players.push(player);
            }
        }

        if (players.length === 0) {
            return interaction.editReply({
                embeds: [errorEmbed('No Players', 'You must select at least one player.')]
            });
        }

        // Add rings to all players
        const results = [];
        for (const player of players) {
            // Ensure user exists
            await db.createOrUpdateUser(player.id, player.username);

            // Add ring
            const ring = await db.addChampionshipRing(
                interaction.guildId,
                league.id,
                player.id,
                season,
                opponent,
                interaction.user.id
            );

            if (ring) {
                results.push(`✅ <@${player.id}>`);
            } else {
                results.push(`⚠️ <@${player.id}> (already has ring)`);
            }
        }

        // Post to awards channel if configured
        const channels = await db.getGuildChannels(interaction.guildId);
        
        const congratsEmbed = successEmbed(
            `${config.emojis.ring} Championship Rings Awarded!`,
            `**${league.league_name} - ${season} Champions**${opponent ? `\n\nDefeated **${opponent}** in the finals!` : ''}\n\n${players.map(p => `<@${p.id}>`).join(', ')}`
        );

        if (channels.awards) {
            const awardsChannel = await interaction.guild.channels.fetch(channels.awards);
            if (awardsChannel) {
                await awardsChannel.send({ embeds: [congratsEmbed] });
            }
        }

        await interaction.editReply({
            embeds: [successEmbed(
                'Rings Granted',
                `Successfully granted rings to **${players.length}** player(s) for **${league.league_name} ${season}**!\n\n${results.join('\n')}`
            )]
        });
    }
};