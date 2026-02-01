// commands/randomnumber.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const BLURPLE = 0x5865F2; // Discord default color

module.exports = {
    data: new SlashCommandBuilder()
        .setName('randomnumber')
        .setDescription('Generate a random number between a min and max')
        .addIntegerOption(option =>
            option.setName('min')
                .setDescription('Minimum number')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('max')
                .setDescription('Maximum number')
                .setRequired(true)),

    async execute(interaction) {
        const min = interaction.options.getInteger('min');
        const max = interaction.options.getInteger('max');

        if (max < min) {
            return interaction.reply({ content: '❌ Maximum cannot be less than minimum!', ephemeral: true });
        }

        const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;

        const embed = new EmbedBuilder()
            .setTitle('🎲 Random Number Generator')
            .setDescription(`Your random number between **${min}** and **${max}** is:\n**${randomNumber}**`)
            .setColor(BLURPLE)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
