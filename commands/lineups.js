// commands/lineups.js
const { SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const { successEmbed, errorEmbed } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lineups')
        .setDescription('View all lineups in this server'),
    
    async execute(interaction) {
        const lineups = await db.getLineups(interaction.guildId);
        
        if (lineups.length === 0) {
            return interaction.reply({
                embeds: [errorEmbed('No Lineups', 'No lineups have been created yet.\nUse `/lineup create` to make one.')],
                ephemeral: true
            });
        }

        const lineupList = lineups.map(l => `• **${l.lineup_name}**${l.description ? ` - ${l.description}` : ''}`).join('\n');
        
        await interaction.reply({
            embeds: [successEmbed('📋 Server Lineups', lineupList)]
        });
    }
};