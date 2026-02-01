// commands/league-add.js
const { SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const { successEmbed, errorEmbed } = require('../utils/embeds');
const { hasManagerPerms } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('league-remove')
        .setDescription('Remove a league (Manager only)')
        .addStringOption(option =>
            option.setName('abbreviation')
                .setDescription('League abbreviation to remove')
                .setRequired(true)
                .setMaxLength(10)),

    async execute(interaction) {
        // Check permissions
        if (!await hasManagerPerms(interaction)) {
            return interaction.reply({
                embeds: [errorEmbed('Permission Denied', 'You need Manager role or higher to use this command.')],
                ephemeral: true
            });
        }

        const abbr = interaction.options.getString('abbreviation').toUpperCase();

        try {
            // Remove league from DB
            const removed = await db.removeLeague(interaction.guildId, abbr);
            if (!removed) {
                return interaction.reply({
                    embeds: [errorEmbed('Not Found', `No league found with abbreviation **${abbr}**`)],
                    ephemeral: true
                });
            }

            await interaction.reply({
                embeds: [successEmbed('League Removed', `Successfully removed league with abbreviation **${abbr}**`)],
                ephemeral: true
            });

        } catch (error) {
            console.error('League remove error:', error);
            return interaction.reply({
                embeds: [errorEmbed('Failed', `Failed to remove league: ${error.message}`)],
                ephemeral: true
            });
        }
    }
};
