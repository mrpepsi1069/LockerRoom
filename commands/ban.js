// commands/ban.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { errorEmbed, successEmbed } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a user from the server (Admin only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to ban')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for ban')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('delete_days')
                .setDescription('Delete messages from last X days (0-7)')
                .setMinValue(0)
                .setMaxValue(7)
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    
    async execute(interaction) {
        // Check if user has ban permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return interaction.reply({
                embeds: [errorEmbed('Permission Denied', 'You need Ban Members permission to use this command.')],
                ephemeral: true
            });
        }

        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const deleteDays = interaction.options.getInteger('delete_days') || 0;

        // Get the member object if they're in the server
        let targetMember;
        try {
            targetMember = await interaction.guild.members.fetch(targetUser.id);
        } catch (error) {
            // User is not in the server, can still ban by ID
            targetMember = null;
        }

        // Check if bot can ban this user
        if (targetMember) {
            // Can't ban yourself
            if (targetUser.id === interaction.user.id) {
                return interaction.reply({
                    embeds: [errorEmbed('Invalid Target', 'You cannot ban yourself!')],
                    ephemeral: true
                });
            }

            // Can't ban the server owner
            if (targetUser.id === interaction.guild.ownerId) {
                return interaction.reply({
                    embeds: [errorEmbed('Invalid Target', 'You cannot ban the server owner!')],
                    ephemeral: true
                });
            }

            // Check role hierarchy
            if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
                return interaction.reply({
                    embeds: [errorEmbed('Permission Denied', 'You cannot ban someone with an equal or higher role!')],
                    ephemeral: true
                });
            }

            // Check if bot can ban (role hierarchy)
            if (targetMember.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
                return interaction.reply({
                    embeds: [errorEmbed('Bot Permission Error', 'I cannot ban this user as their role is higher than mine!')],
                    ephemeral: true
                });
            }

            // Can't ban if target is not bannable
            if (!targetMember.bannable) {
                return interaction.reply({
                    embeds: [errorEmbed('Cannot Ban', 'I do not have permission to ban this user!')],
                    ephemeral: true
                });
            }
        }

        // Try to DM the user before banning
        try {
            const dmEmbed = new EmbedBuilder()
                .setTitle('🔨 You have been banned')
                .setDescription(`You have been banned from **${interaction.guild.name}**`)
                .addFields(
                    { name: 'Reason', value: reason },
                    { name: 'Banned by', value: interaction.user.tag }
                )
                .setColor('#ED4245')
                .setTimestamp();

            await targetUser.send({ embeds: [dmEmbed] });
        } catch (error) {
            // User has DMs disabled or bot can't DM them
            console.log(`Could not DM ${targetUser.tag} about their ban`);
        }

        // Execute the ban
        try {
            await interaction.guild.members.ban(targetUser.id, {
                reason: `${reason} | Banned by ${interaction.user.tag}`,
                deleteMessageSeconds: deleteDays * 24 * 60 * 60
            });

            const successBanEmbed = new EmbedBuilder()
                .setTitle('🔨 User Banned')
                .setDescription(`**${targetUser.tag}** has been banned from the server`)
                .addFields(
                    { name: 'User ID', value: targetUser.id, inline: true },
                    { name: 'Banned by', value: interaction.user.tag, inline: true },
                    { name: 'Reason', value: reason },
                    { name: 'Messages Deleted', value: `${deleteDays} day(s)`, inline: true }
                )
                .setColor('#ED4245')
                .setThumbnail(targetUser.displayAvatarURL())
                .setTimestamp();

            await interaction.reply({ embeds: [successBanEmbed] });

        } catch (error) {
            console.error('Error banning user:', error);
            return interaction.reply({
                embeds: [errorEmbed('Ban Failed', `Failed to ban user: ${error.message}`)],
                ephemeral: true
            });
        }
    }
};