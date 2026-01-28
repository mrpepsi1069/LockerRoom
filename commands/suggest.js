// commands/suggest.js
const { SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const { successEmbed } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('suggest')
        .setDescription('Submit a suggestion')
        .addStringOption(option =>
            option.setName('suggestion')
                .setDescription('Your suggestion')
                .setRequired(true)
                .setMaxLength(500)),
    
    async execute(interaction) {
        const suggestion = interaction.options.getString('suggestion');

        // Save to database
        await db.createSuggestion(interaction.guildId, interaction.user.id, suggestion);

        await interaction.reply({
            embeds: [successEmbed('Suggestion Submitted', 'Thank you for your suggestion! The server admins will review it.')],
            ephemeral: true
        });
    }
};