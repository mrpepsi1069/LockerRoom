// commands/role.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { errorEmbed, successEmbed } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('role')
        .setDescription('Assign a role to a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to assign the role to')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Role to assign')
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
                embeds: [errorEmbed('Permission Denied', 'You cannot assign a role equal or higher than your highest role!')],
                ephemeral: true
            });
        }
        if (role.position >= interaction.guild.members.me.roles.highest.position) {
            return interaction.reply({
                embeds: [errorEmbed('Bot Permission Denied', 'I cannot assign this role because it is higher than my highest role!')],
                ephemeral: true
            });
        }

        // Check if user already has the role
        if (member.roles.cache.has(role.id)) {
            return interaction.reply({
                embeds: [errorEmbed('Already Has Role', `${targetUser.tag} already has the role **${role.name}**`)],
                ephemeral: true
            });
        }

        // Add role
        try {
            await member.roles.add(role);
            return interaction.reply({
                embeds: [successEmbed('Role Added', `✅ Added **${role.name}** to **${targetUser.tag}**`)]
            });
        } catch (error) {
            console.error('Error adding role:', error);
            return interaction.reply({
                embeds: [errorEmbed('Action Failed', `Failed to add role: ${error.message}`)],
                ephemeral: true
            });
        }
    }
};
