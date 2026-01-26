// commands/awardcheck.js
const { SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const { awardsEmbed, errorEmbed } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('awardcheck')
        .setDescription('View a player\'s awards and championship rings')
        .addUserOption(option =>
            option.setName('member')
                .setDescription('Member to check (leave empty for yourself)')
                .setRequired(false)),
    
    async execute(interaction) {
        const targetUser = interaction.options.getUser('member') || interaction.user;

        // Ensure user exists in database
        await db.createOrUpdateUser(targetUser.id, targetUser.username);

        // Get user's awards
        const awards = await db.getUserAwards(interaction.guildId, targetUser.id);

        if (!awards) {
            return interaction.reply({
                embeds: [errorEmbed('User Not Found', 'Could not find this user\'s data.')],
                ephemeral: true
            });
        }

        const embed = awardsEmbed(awards, awards);
        await interaction.reply({ embeds: [embed] });
    }
};