// commands/dmtcmembers.js
const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../utils/embeds');
const { hasStaffPerms, checkPremium } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dmtcmembers')
        .setDescription('DM all members with a custom message (Staff + Premium)')
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Role to DM')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Message to send')
                .setRequired(true)
                .setMaxLength(1000)),
    
    async execute(interaction) {
        // Check permissions
        if (!await hasStaffPerms(interaction)) {
            return interaction.reply({ 
                embeds: [errorEmbed('Permission Denied', 'You need Staff role or higher to use this command.')], 
                ephemeral: true 
            });
        }

        // Check premium
        const isPremium = await checkPremium(interaction.guildId);
        if (!isPremium) {
            return interaction.reply({
                embeds: [errorEmbed('Premium Required', 'This feature requires Premium!')],
                ephemeral: true
            });
        }

        const role = interaction.options.getRole('role');
        const message = interaction.options.getString('message');

        await interaction.deferReply({ ephemeral: true });

        try {
            const members = await interaction.guild.members.fetch();
            const roleMembers = members.filter(m => m.roles.cache.has(role.id) && !m.user.bot);

            let successCount = 0;
            let failCount = 0;

            for (const [, member] of roleMembers) {
                try {
                    await member.send(`**Message from ${interaction.guild.name}:**\n\n${message}`);
                    successCount++;
                } catch (err) {
                    failCount++;
                    console.log(`Could not DM ${member.user.tag}`);
                }
            }

            await interaction.editReply({
                embeds: [successEmbed('DMs Sent', `Successfully sent DM to **${successCount}** member(s)${failCount > 0 ? `\nFailed to DM **${failCount}** member(s) (DMs disabled)` : ''}`)]
            });
        } catch (error) {
            await interaction.editReply({
                embeds: [errorEmbed('Failed', 'An error occurred while sending DMs.')]
            });
        }
    }
};