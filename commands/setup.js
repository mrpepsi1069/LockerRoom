// commands/setup.js - Updated setup command
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed } = require('../utils/embeds');
const db = require('../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Set up the bot for your server')
        .addChannelOption(option =>
            option.setName('leaguelogchannel')
                .setDescription('Channel for league logs')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('historychannel')
                .setDescription('Channel for team history')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('logchannel')
                .setDescription('Channel for bot logs')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('contractchannel')
                .setDescription('Channel for player contracts')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('coachrole')
                .setDescription('Coach role')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('ownerrole')
                .setDescription('Owner role')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const leagueLogChannel = interaction.options.getChannel('leaguelogchannel');
            const historyChannel = interaction.options.getChannel('historychannel');
            const logChannel = interaction.options.getChannel('logchannel');
            const contractChannel = interaction.options.getChannel('contractchannel');
            const coachRole = interaction.options.getRole('coachrole');
            const ownerRole = interaction.options.getRole('ownerrole');

            // Ensure guild exists in database
            await db.createGuild(interaction.guildId, interaction.guild.name);

            // Store channels
            await db.setGuildChannel(interaction.guildId, 'league_log', leagueLogChannel.id);
            await db.setGuildChannel(interaction.guildId, 'history', historyChannel.id);
            await db.setGuildChannel(interaction.guildId, 'log', logChannel.id);
            await db.setGuildChannel(interaction.guildId, 'contract', contractChannel.id);

            // Store roles
            await db.setGuildRole(interaction.guildId, 'coach', coachRole.id);
            await db.setGuildRole(interaction.guildId, 'owner', ownerRole.id);

            // Mark setup as completed
            await db.updateGuildSetup(interaction.guildId, true);

            const embed = successEmbed(
                '✅ Setup Complete',
                '**Channels:**\n' +
                `League Log: ${leagueLogChannel}\n` +
                `History: ${historyChannel}\n` +
                `Log: ${logChannel}\n` +
                `Contract: ${contractChannel}\n\n` +
                '**Roles:**\n' +
                `Coach: ${coachRole}\n` +
                `Owner: ${ownerRole}\n\n` +
                'Your server is now configured!'
            );

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Setup error:', error);
            await interaction.editReply({
                embeds: [errorEmbed('Setup Failed', 'An error occurred during setup. Please try again.')]
            });
        }
    }
};