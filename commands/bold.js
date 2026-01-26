// commands/bold.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bold')
        .setDescription('Boldify text')
        .addStringOption(option =>
            option.setName('text')
                .setDescription('Text to make bold')
                .setRequired(true)),
    
    async execute(interaction) {
        const text = interaction.options.getString('text');
        const boldText = text.split('').map(char => {
            const code = char.charCodeAt(0);
            // Convert alphanumeric to bold unicode
            if (code >= 65 && code <= 90) {
                return String.fromCodePoint(code + 119743); // A-Z
            } else if (code >= 97 && code <= 122) {
                return String.fromCodePoint(code + 119737); // a-z
            } else if (code >= 48 && code <= 57) {
                return String.fromCodePoint(code + 120734); // 0-9
            }
            return char;
        }).join('');

        await interaction.reply(boldText);
    }
};