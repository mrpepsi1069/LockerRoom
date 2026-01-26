// commands/help.js
const { SlashCommandBuilder } = require('discord.js');
const { helpEmbed } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Display the command help menu'),
    
    async execute(interaction) {
        const embed = helpEmbed();
        await interaction.reply({ embeds: [embed] });
    }
};