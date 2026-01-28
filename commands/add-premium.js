// commands/add-premium.js
const { SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const { successEmbed, errorEmbed } = require('../utils/embeds');
const { isOwner } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-premium')
        .setDescription('Grant premium to a guild (Owner only)')
        .addStringOption(option =>
            option.setName('guild_id')
                .setDescription('Guild ID to grant premium')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('days')
                .setDescription('Premium duration in days (leave empty for lifetime)')
                .setRequired(false)
                .setMinValue(1)),
    
    async execute(interaction) {
        // Check if owner
        if (!await isOwner(interaction.user.id)) {
            return interaction.reply({
                embeds: [errorEmbed('Permission Denied', 'This command is owner-only.')],
                ephemeral: true
            });
        }

        const guildId = interaction.options.getString('guild_id');
        const days = interaction.options.getInteger('days');

        // Check if guild exists in bot
        const guild = interaction.client.guilds.cache.get(guildId);
        if (!guild) {
            return interaction.reply({
                embeds: [errorEmbed('Guild Not Found', 'The bot is not in that guild.')],
                ephemeral: true
            });
        }

        // Calculate expiry date
        let expiresAt = null;
        if (days) {
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + days);
        }

        // Grant premium
        await db.setPremium(guildId, true, expiresAt);

        const durationText = days ? `for **${days} days**` : 'with **lifetime** access';
        
        await interaction.reply({
            embeds: [successEmbed('Premium Granted', `Successfully granted premium to **${guild.name}** ${durationText}!`)]
        });
    }
};