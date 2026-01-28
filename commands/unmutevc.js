// commands/unmutevc.js
const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../utils/embeds');
const { hasStaffPerms } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmutevc')
        .setDescription('Unmute everyone in your current voice channel (Staff only)'),
    
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

        let unmutedCount = 0;
        for (const [, member] of voiceChannel.members) {
            if (member.voice.serverMute) {
                try {
                    await member.voice.setMute(false);
                    unmutedCount++;
                } catch (err) {
                    console.log(`Could not unmute ${member.user.tag}`);
                }
            }
        }

        await interaction.reply({
            embeds: [successEmbed('Voice Channel Unmuted', `Successfully unmuted **${unmutedCount}** member(s) in ${voiceChannel.name}`)]
        });
    }
};