// commands/flipcoin.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const BLURPLE = 0x5865F2; // Discord default color

module.exports = {
    data: new SlashCommandBuilder()
        .setName('flipcoin')
        .setDescription('Flip a coin (heads or tails)'),

    async execute(interaction) {
        const result = Math.random() < 0.5 ? 'Heads' : 'Tails';

        const embed = new EmbedBuilder()
            .setTitle(`${emoji} ${result}!`)
            .setDescription(`The coin landed on **${result}**`)
            .setColor(BLURPLE)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};