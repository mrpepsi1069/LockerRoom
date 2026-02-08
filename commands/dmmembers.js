// commands/dmmembers.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../utils/embeds');
const { hasCoachPerms } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dmmembers')
        .setDescription('DM all members with a custom message (Coach only)')
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
        if (!await hasCoachPerms(interaction)) {
            return interaction.reply({
                embeds: [errorEmbed('Permission Denied', 'You need Coach role or higher to use this command.')],
                ephemeral: true
            });
        }

        const role = interaction.options.getRole('role');
        const message = interaction.options.getString('message');

        await interaction.deferReply({ ephemeral: true });

        try {
            const members = await interaction.guild.members.fetch();
            const roleMembers = members.filter(
                m => m.roles.cache.has(role.id) && !m.user.bot
            );

            if (roleMembers.size === 0) {
                return interaction.editReply({
                    embeds: [errorEmbed('No Members', `No members found with the ${role} role!`)]
                });
            }

            let successCount = 0;
            let failCount = 0;

            for (const [, member] of roleMembers) {
                try {
                    // Create embed similar to the screenshot
                    const dmEmbed = new EmbedBuilder()
                        .setAuthor({ 
                            name: interaction.guild.name,
                            iconURL: interaction.guild.iconURL({ dynamic: true })
                        })
                        .setTitle('Message Received')
                        .setDescription(`🔔 **Message:** ${message}`)
                        .addFields(
                            { 
                                name: '👤 Sent By:', 
                                value: `${interaction.user} ${interaction.user.tag}`, 
                                inline: false 
                            },
                            { 
                                name: '🏠 Server:', 
                                value: `${interaction.guild.name} ${interaction.guild.iconURL() ? `🏈 ${interaction.guild.name}` : ''} • #${interaction.channel.name}`, 
                                inline: false 
                            }
                        )
                        .setColor('#5865F2')
                        .setTimestamp();

                    await member.send({ embeds: [dmEmbed] });
                    successCount++;
                    // Small delay to avoid rate limits
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                    console.log(`Failed to DM ${member.user.tag}`);
                    failCount++;
                }
            }

            await interaction.editReply({
                embeds: [
                    successEmbed(
                        '📨 DMs Sent',
                        `Successfully sent DM to **${successCount}** member(s) with ${role}` +
                        (failCount > 0
                            ? `\n\n⚠️ Failed to DM **${failCount}** member(s) (DMs disabled)`
                            : '')
                    )
                ]
            });
        } catch (error) {
            console.error('DM error:', error);
            await interaction.editReply({
                embeds: [errorEmbed('Failed', 'An error occurred while sending DMs.')]
            });
        }
    }
};