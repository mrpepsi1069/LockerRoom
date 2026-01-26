// commands/botstats.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');
const { errorEmbed } = require('../utils/embeds');
const { isOwner } = require('../utils/permissions');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botstats')
        .setDescription('View global bot statistics (Owner only)'),
    
    async execute(interaction) {
        // Check if owner
        if (!await isOwner(interaction.user.id)) {
            return interaction.reply({
                embeds: [errorEmbed('Permission Denied', 'This command is owner-only.')],
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        const stats = await db.getBotStats();
        const uptime = process.uptime();
        const uptimeString = formatUptime(uptime);

        const embed = new EmbedBuilder()
            .setTitle('📊 Bot Statistics')
            .addFields(
                { name: 'Total Guilds', value: stats.total_guilds.toString(), inline: true },
                { name: 'Premium Guilds', value: stats.premium_guilds.toString(), inline: true },
                { name: 'Total Users', value: stats.total_users.toString(), inline: true },
                { name: 'Total Commands Used', value: stats.total_commands_used.toString(), inline: true },
                { name: 'Uptime', value: uptimeString, inline: true },
                { name: 'Memory Usage', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true }
            )
            .setColor(config.colors.primary)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
};

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
}