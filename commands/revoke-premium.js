// commands/revoke-premium.js
const { SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const { successEmbed, errorEmbed } = require('../utils/embeds');
const { isOwner } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('revoke-premium')
        .setDescription('Revoke premium from a guild (Owner only)')
        .addStringOption(option =>
            option.setName('guild_id')
                .setDescription('Guild ID to revoke premium')
                .setRequired(true)),
    
    async execute(interaction) {
        // Check if owner
        if (!await isOwner(interaction.user.id)) {
            return interaction.reply({
                embeds: [errorEmbed('Permission Denied', 'This command is owner-only.')],
                ephemeral: true
            });
        }

        const guildId = interaction.options.getString('guild_id');

        // Check if guild exists in bot
        const guild = interaction.client.guilds.cache.get(guildId);
        if (!guild) {
            return interaction.reply({
                embeds: [errorEmbed('Guild Not Found', 'The bot is not in that guild.')],
                ephemeral: true
            });
        }

        // Revoke premium
        await db.setPremium(guildId, false, null);

        await interaction.reply({
            embeds: [successEmbed('Premium Revoked', `Successfully revoked premium from **${guild.name}**`)]
        });
    }
};