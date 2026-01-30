// commands/timeout.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { errorEmbed, successEmbed } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Timeout a user (Moderator only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to timeout')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Duration in minutes (max 40320 = 28 days)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(40320))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for timeout')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    async execute(interaction) {
        // Check if user has timeout permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({
                embeds: [errorEmbed('Permission Denied', 'You need Moderate Members permission to use this command.')],
                ephemeral: true
            });
        }

        const targetUser = interaction.options.getUser('user');
        const duration = interaction.options.getInteger('duration'); // in minutes
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

        // Can't timeout yourself
        if (targetUser.id === interaction.user.id) {
            return interaction.reply({
                embeds: [errorEmbed('Invalid Target', 'You cannot timeout yourself!')],
                ephemeral: true
            });
        }

        // Can't timeout the server owner
        if (targetUser.id === interaction.guild.ownerId) {
            return interaction.reply({
                embeds: [errorEmbed('Invalid Target', 'You cannot timeout the server owner!')],
                ephemeral: true
            });
        }

        // Check role hierarchy
        if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
            return interaction.reply({
                embeds: [errorEmbed('Permission Denied', 'You cannot timeout someone with an equal or higher role!')],
                ephemeral: true
            });
        }

        // Check if bot can timeout (role hierarchy)
        if (targetMember.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
            return interaction.reply({
                embeds: [errorEmbed('Bot Permission Error', 'I cannot timeout this user as their role is higher than mine!')],
                ephemeral: true
            });
        }

        // Can't timeout if target is not moderatable
        if (!targetMember.moderatable) {
            return interaction.reply({
                embeds: [errorEmbed('Cannot Timeout', 'I do not have permission to timeout this user!')],
                ephemeral: true
            });
        }

        // Calculate timeout end time
        const durationMs = duration * 60 * 1000; // Convert minutes to milliseconds
        const timeoutUntil = new Date(Date.now() + durationMs);

        // Format duration for display
        const formatDuration = (minutes) => {
            if (minutes < 60) return `${minutes} minute(s)`;
            if (minutes < 1440) return `${Math.floor(minutes / 60)} hour(s)`;
            return `${Math.floor(minutes / 1440)} day(s)`;
        };

        // Try to DM the user before timing them out
        try {
            const dmEmbed = new EmbedBuilder()
                .setTitle('⏱️ You have been timed out')
                .setDescription(`You have been timed out in **${interaction.guild.name}**`)
                .addFields(
                    { name: 'Duration', value: formatDuration(duration), inline: true },
                    { name: 'Reason', value: reason },
                    { name: 'Timed out by', value: interaction.user.tag },
                    { name: 'Timeout ends', value: `<t:${Math.floor(timeoutUntil.getTime() / 1000)}:F>` }
                )
                .setColor('#FFA500')
                .setTimestamp();

            await targetUser.send({ embeds: [dmEmbed] });
        } catch (error) {
            // User has DMs disabled or bot can't DM them
            console.log(`Could not DM ${targetUser.tag} about their timeout`);
        }

        // Execute the timeout
        try {
            await targetMember.timeout(durationMs, `${reason} | Timed out by ${interaction.user.tag}`);

            const successTimeoutEmbed = new EmbedBuilder()
                .setTitle('⏱️ User Timed Out')
                .setDescription(`**${targetUser.tag}** has been timed out`)
                .addFields(
                    { name: 'User ID', value: targetUser.id, inline: true },
                    { name: 'Duration', value: formatDuration(duration), inline: true },
                    { name: 'Timed out by', value: interaction.user.tag, inline: true },
                    { name: 'Reason', value: reason },
                    { name: 'Timeout ends', value: `<t:${Math.floor(timeoutUntil.getTime() / 1000)}:R>` }
                )
                .setColor('#FFA500')
                .setThumbnail(targetUser.displayAvatarURL())
                .setTimestamp();

            await interaction.reply({ embeds: [successTimeoutEmbed] });

        } catch (error) {
            console.error('Error timing out user:', error);
            return interaction.reply({
                embeds: [errorEmbed('Timeout Failed', `Failed to timeout user: ${error.message}`)],
                ephemeral: true
            });
        }
    }
};