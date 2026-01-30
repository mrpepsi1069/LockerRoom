// commands/adminkick.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { errorEmbed, successEmbed } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('adminkick')
        .setDescription('Kick a user from the server (Admin only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to kick')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for kick')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    
    async execute(interaction) {
        // Check if user has kick permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
            return interaction.reply({
                embeds: [errorEmbed('Permission Denied', 'You need Kick Members permission to use this command.')],
                ephemeral: true
            });
        }

        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        // Get the member object
        let targetMember;
        try {
            targetMember = await interaction.guild.members.fetch(targetUser.id);
        } catch (error) {
            return interaction.reply({
                embeds: [errorEmbed('User Not Found', 'This user is not in the server!')],
                ephemeral: true
            });
        }

        // Can't kick yourself
        if (targetUser.id === interaction.user.id) {
            return interaction.reply({
                embeds: [errorEmbed('Invalid Target', 'You cannot kick yourself!')],
                ephemeral: true
            });
        }

        // Can't kick the server owner
        if (targetUser.id === interaction.guild.ownerId) {
            return interaction.reply({
                embeds: [errorEmbed('Invalid Target', 'You cannot kick the server owner!')],
                ephemeral: true
            });
        }

        // Check role hierarchy
        if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
            return interaction.reply({
                embeds: [errorEmbed('Permission Denied', 'You cannot kick someone with an equal or higher role!')],
                ephemeral: true
            });
        }

        // Check if bot can kick (role hierarchy)
        if (targetMember.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
            return interaction.reply({
                embeds: [errorEmbed('Bot Permission Error', 'I cannot kick this user as their role is higher than mine!')],
                ephemeral: true
            });
        }

        // Can't kick if target is not kickable
        if (!targetMember.kickable) {
            return interaction.reply({
                embeds: [errorEmbed('Cannot Kick', 'I do not have permission to kick this user!')],
                ephemeral: true
            });
        }

        // Try to DM the user before kicking
        try {
            const dmEmbed = new EmbedBuilder()
                .setTitle('👢 You have been kicked')
                .setDescription(`You have been kicked from **${interaction.guild.name}**`)
                .addFields(
                    { name: 'Reason', value: reason },
                    { name: 'Kicked by', value: interaction.user.tag }
                )
                .setColor('#FFA500')
                .setTimestamp();

            await targetUser.send({ embeds: [dmEmbed] });
        } catch (error) {
            // User has DMs disabled or bot can't DM them
            console.log(`Could not DM ${targetUser.tag} about their kick`);
        }

        // Execute the kick
        try {
            await targetMember.kick(`${reason} | Kicked by ${interaction.user.tag}`);

            const successKickEmbed = new EmbedBuilder()
                .setTitle('👢 User Kicked')
                .setDescription(`**${targetUser.tag}** has been kicked from the server`)
                .addFields(
                    { name: 'User ID', value: targetUser.id, inline: true },
                    { name: 'Kicked by', value: interaction.user.tag, inline: true },
                    { name: 'Reason', value: reason }
                )
                .setColor('#FFA500')
                .setThumbnail(targetUser.displayAvatarURL())
                .setTimestamp();

            await interaction.reply({ embeds: [successKickEmbed] });

        } catch (error) {
            console.error('Error kicking user:', error);
            return interaction.reply({
                embeds: [errorEmbed('Kick Failed', `Failed to kick user: ${error.message}`)],
                ephemeral: true
            });
        }
    }
};