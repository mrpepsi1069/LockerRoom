// commands/unrole.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { errorEmbed, successEmbed } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unrole')
        .setDescription('Remove a role from a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to remove the role from')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Role to remove')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const role = interaction.options.getRole('role');

        // Fetch member
        let member;
        try {
            member = await interaction.guild.members.fetch(targetUser.id);
        } catch {
            return interaction.reply({
                embeds: [errorEmbed('User Not Found', 'This user is not in the server!')],
                ephemeral: true
            });
        }

        // Role hierarchy checks
        if (role.position >= interaction.member.roles.highest.position) {
            return interaction.reply({
                embeds: [errorEmbed('Permission Denied', 'You cannot remove a role equal or higher than your highest role!')],
                ephemeral: true
            });
        }
        if (role.position >= interaction.guild.members.me.roles.highest.position) {
            return interaction.reply({
                embeds: [errorEmbed('Bot Permission Denied', 'I cannot remove this role because it is higher than my highest role!')],
                ephemeral: true
            });
        }

        // Check if user actually has the role
        if (!member.roles.cache.has(role.id)) {
            return interaction.reply({
                embeds: [errorEmbed('Does Not Have Role', `${targetUser.tag} does not have the role **${role.name}**`)],
                ephemeral: true
            });
        }

        // Remove role
        try {
            await member.roles.remove(role);
            return interaction.reply({
                embeds: [successEmbed('Role Removed', `❌ Removed **${role.name}** from **${targetUser.tag}**`)]
            });
        } catch (error) {
            console.error('Error removing role:', error);
            return interaction.reply({
                embeds: [errorEmbed('Action Failed', `Failed to remove role: ${error.message}`)],
                ephemeral: true
            });
        }
    }
};
