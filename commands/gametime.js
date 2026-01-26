// commands/gametime.js
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database');
const { gametimeEmbed, errorEmbed, successEmbed } = require('../utils/embeds');
const { hasManagerPerms, checkPremium } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gametime')
        .setDescription('Create a game-time attendance poll')
        .addStringOption(option =>
            option.setName('league')
                .setDescription('League abbreviation')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('time')
                .setDescription('Game time (e.g., "2024-12-25 7:30 PM" or timestamp)')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Role to ping')
                .setRequired(true)),
    
    async execute(interaction) {
        // Check permissions
        if (!await hasManagerPerms(interaction)) {
            return interaction.reply({ 
                embeds: [errorEmbed('Permission Denied', 'You need Manager role or higher to use this command.')], 
                ephemeral: true 
            });
        }

        const leagueAbbr = interaction.options.getString('league').toUpperCase();
        const timeString = interaction.options.getString('time');
        const role = interaction.options.getRole('role');

        // Parse time
        let gameTime;
        try {
            gameTime = new Date(timeString);
            if (isNaN(gameTime.getTime())) {
                throw new Error('Invalid date');
            }
        } catch (error) {
            return interaction.reply({
                embeds: [errorEmbed('Invalid Time', 'Please provide a valid time format.\nExamples: "2024-12-25 7:30 PM" or "December 25, 2024 7:30 PM"')],
                ephemeral: true
            });
        }

        // Check if time is in the past
        if (gameTime < new Date()) {
            return interaction.reply({
                embeds: [errorEmbed('Invalid Time', 'Game time cannot be in the past.')],
                ephemeral: true
            });
        }

        // Get league
        const league = await db.getLeagueByAbbr(interaction.guildId, leagueAbbr);
        if (!league) {
            return interaction.reply({
                embeds: [errorEmbed('League Not Found', `League with abbreviation **${leagueAbbr}** does not exist.\nUse \`/league-add\` to create it first.`)],
                ephemeral: true
            });
        }

        await interaction.deferReply();

        // Create embed
        const embed = gametimeEmbed(league.league_name, gameTime, role.name);

        // Create buttons
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('attendance_yes')
                    .setLabel('Attending')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId('attendance_maybe')
                    .setLabel('Maybe')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('❓'),
                new ButtonBuilder()
                    .setCustomId('attendance_no')
                    .setLabel('Not Attending')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌')
            );

        // Send the message
        const message = await interaction.channel.send({
            content: `${role}`,
            embeds: [embed],
            components: [row]
        });

        // Save to database
        await db.createGametime(
            interaction.guildId,
            league.id,
            gameTime,
            message.id,
            interaction.channelId,
            role.id,
            interaction.user.id
        );

        // Check if premium for auto-DM
        const isPremium = await checkPremium(interaction.guildId);
        const premiumNote = isPremium 
            ? '\n✨ Premium: Players will be auto-DMed!' 
            : '\n💎 Upgrade to Premium for auto-DM reminders!';

        await interaction.editReply({
            embeds: [successEmbed('Game Time Created', `Successfully created game time poll for **${league.league_name}**${premiumNote}`)],
            ephemeral: true
        });

        // TODO: If premium, DM all members with the role
        if (isPremium) {
            const preferences = await db.getGuildPreferences(interaction.guildId);
            if (preferences && preferences.auto_dm_gametimes) {
                // Implementation for auto-DM would go here
                // Get all members with the role and DM them
            }
        }
    }
};