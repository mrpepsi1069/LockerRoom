// commands/change-description.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../utils/embeds');
const { isOwner } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('change-description')
        .setDescription('Change the bot\'s description (Owner only)')
        .addStringOption(option =>
            option.setName('description')
                .setDescription('New bot description')
                .setRequired(true)
                .setMaxLength(190)), // Leave room for "By Ghostie"
    
    async execute(interaction) {
        // Check if owner
        if (!await isOwner(interaction.user.id)) {
            return interaction.reply({
                embeds: [errorEmbed('Permission Denied', 'This command is owner-only.')],
                ephemeral: true
            });
        }

        const description = interaction.options.getString('description');
        const fullDescription = `${description}\n\nBy Ghostie`;

        try {
            await interaction.client.user.setAbout(fullDescription);

            await interaction.reply({
                embeds: [successEmbed('Description Changed', `Successfully updated bot description:\n\n${fullDescription}`)],
                ephemeral: true
            });
        } catch (error) {
            console.error('Change description error:', error);
            await interaction.reply({
                embeds: [errorEmbed('Failed', `Could not change bot description: ${error.message}`)],
                ephemeral: true
            });
        }
    }
};