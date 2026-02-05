// commands/times.js - FIXED (no collector)
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { hasManagerPerms } = require('../utils/permissions');
const { successEmbed, errorEmbed } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('times')
        .setDescription('Create a poll for multiple time options')
        .addStringOption(option =>
            option.setName('league')
                .setDescription('League name/abbreviation')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('times')
                .setDescription('Time options separated by commas (e.g., "7 PM EST, 8 PM EST, 9 PM EST")')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Role to ping')
                .setRequired(true)),

    async execute(interaction) {
        if (!await hasManagerPerms(interaction)) {
            return interaction.reply({
                embeds: [errorEmbed('Permission Denied', 'You need Manager role or higher!')],
                ephemeral: true
            });
        }

        const league = interaction.options.getString('league');
        const timesInput = interaction.options.getString('times');
        const role = interaction.options.getRole('role');

        // Parse times
        const times = timesInput.split(',').map(t => t.trim()).filter(t => t.length > 0);  // Line 36 - NEW CODE

        if (times.length < 2) {
            return interaction.reply({
                embeds: [errorEmbed('Invalid Input', 'Please provide at least 2 time options separated by commas!')],
                ephemeral: true
            });
        }

        if (times.length > 5) {
            return interaction.reply({
                embeds: [errorEmbed('Too Many Options', 'Maximum 5 time options allowed!')],
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        // Build description
        let description = `**League:** ${league}\n\nSelect which times work for you:\n\n`;
        times.forEach((time, index) => {
            description += `🕐 **${time}**\n• None yet\n\n`;
        });

        const embed = new EmbedBuilder()
            .setTitle('⏰ Available Times Poll')
            .setDescription(description.trim())
            .setColor('#5865F2')
            .setFooter({ text: 'Click the buttons to select your available times' })
            .setTimestamp();

        // Create buttons (max 5)
        const buttons = times.map((time, index) => 
            new ButtonBuilder()
                .setCustomId(`times_${index}_${time.replace(/\s+/g, '_')}`)
                .setLabel(time)
                .setStyle(ButtonStyle.Primary)
        );

        // Split into rows (max 5 buttons per row)
        const rows = [];
        for (let i = 0; i < buttons.length; i += 5) {
            rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
        }

        // Send message
        const message = await interaction.channel.send({
            content: `${role}`,
            embeds: [embed],
            components: rows
        });

        await interaction.editReply({
            embeds: [successEmbed('Times Poll Created', `Created times poll for **${league}**!`)]
        });

        // NO COLLECTOR - index.js handles all button clicks via handleTimesButton
    }
};