// commands/flipcoin.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('flipcoin')
        .setDescription('Flip a coin (heads or tails)'),
    
    async execute(interaction) {
        const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
        const emoji = result === 'Heads' ? '🪙' : '💿';

        const embed = new EmbedBuilder()
            .setTitle(`${emoji} ${result}!`)
            .setDescription(`The coin landed on **${result}**`)
            .setColor(config.colors.primary)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};