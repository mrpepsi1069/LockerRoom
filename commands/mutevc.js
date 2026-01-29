// commands/mutevc.js
const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../utils/embeds');
const { hasStaffPerms, hasManagerPerms } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mutevc')
        .setDescription('Mute everyone in your current voice channel (Staff only)'),
    
    async execute(interaction) {
        // Check permissions
        if (!await hasStaffPerms(interaction)) {
            return interaction.reply({ 
                embeds: [errorEmbed('Permission Denied', 'You need Staff role or higher to use this command.')], 
                ephemeral: true 
            });
        }

        const member = await interaction.guild.members.fetch(interaction.user.id);
        const voiceChannel = member.voice.channel;

        if (!voiceChannel) {
            return interaction.reply({
                embeds: [errorEmbed('Not in Voice', 'You must be in a voice channel to use this command.')],
                ephemeral: true
            });
        }

        let mutedCount = 0;
        let skippedCount = 0;
        
        for (const [, member] of voiceChannel.members) {
            // Skip if: already muted, is the bot, is the command user, or has manager perms
            if (member.voice.serverMute || 
                member.id === interaction.client.user.id || 
                member.id === interaction.user.id ||
                await hasManagerPerms({ member, guild: interaction.guild })) {
                if (!member.voice.serverMute && member.id !== interaction.client.user.id) {
                    skippedCount++;
                }
                continue;
            }

            try {
                await member.voice.setMute(true);
                mutedCount++;
            } catch (err) {
                console.log(`Could not mute ${member.user.tag}`);
            }
        }

        let responseText = `Successfully muted **${mutedCount}** member(s) in ${voiceChannel.name}`;
        if (skippedCount > 0) {
            responseText += `\n*Skipped ${skippedCount} staff/manager(s)*`;
        }

        await interaction.reply({
            embeds: [successEmbed('Voice Channel Muted', responseText)]
        });
    }
};