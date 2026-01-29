// commands/change-pfp.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../utils/embeds');
const { isOwner } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('change-pfp')
        .setDescription('Change the bot\'s profile picture (Owner only)')
        .addStringOption(option =>
            option.setName('url')
                .setDescription('Image URL')
                .setRequired(true)),
    
    async execute(interaction) {
        // DISABLED COMMAND
        return interaction.reply({
            embeds: [errorEmbed('Command Disabled', 'This command has been disabled.')],
            ephemeral: true
        });

        /*
        // Check if owner
        if (!await isOwner(interaction.user.id)) {
            return interaction.reply({
                embeds: [errorEmbed('Permission Denied', 'This command is owner-only.')],
                ephemeral: true
            });
        }

        const url = interaction.options.getString('url');

        try {
            await interaction.client.user.setAvatar(url);

            await interaction.reply({
                embeds: [successEmbed('Profile Picture Changed', 'Successfully updated bot profile picture!')],
                ephemeral: true
            });
        } catch (error) {
            console.error('Change PFP error:', error);
            await interaction.reply({
                embeds: [errorEmbed('Failed', 'Could not change profile picture. Make sure the URL is valid.')],
                ephemeral: true
            });
        }
        */
    }
};