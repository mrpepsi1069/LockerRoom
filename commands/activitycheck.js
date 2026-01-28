// commands/activitycheck.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');
const { successEmbed, errorEmbed } = require('../utils/embeds');
const { hasManagerPerms } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('activitycheck')
        .setDescription('Create an activity check (Manager only)')
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Duration in hours')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(168)) // Max 7 days
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Role to check')
                .setRequired(false)),
    
    async execute(interaction) {
        // Check permissions
        if (!await hasManagerPerms(interaction)) {
            return interaction.reply({ 
                embeds: [errorEmbed('Permission Denied', 'You need Manager role or higher to use this command.')], 
                ephemeral: true 
            });
        }

        const duration = interaction.options.getInteger('duration');
        const role = interaction.options.getRole('role');

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + duration);

        const embed = new EmbedBuilder()
            .setTitle('✅ Activity Check')
            .setDescription(`${role ? role : '@everyone'}\n\n**React with ✅ to confirm you're active!**\n\nExpires: <t:${Math.floor(expiresAt.getTime() / 1000)}:R>`)
            .setColor('#57F287')
            .setTimestamp();

        const message = await interaction.channel.send({
            content: `${role}`,
            embeds: [embed],
        });
        await message.react('✅');

        // Save to database
        await db.createActivityCheck(
            interaction.guildId,
            message.id,
            interaction.channelId,
            expiresAt,
            interaction.user.id
        );

        await interaction.reply({
            embeds: [successEmbed('Activity Check Created', `Activity check will expire in **${duration} hour(s)**`)],
            ephemeral: true
        });
    }
};