// commands/setup.js
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../database');
const { setupCompleteEmbed, errorEmbed, successEmbed } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Configure bot settings (Administrator only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addRoleOption(option =>
            option.setName('gt_role')
                .setDescription('Game Time role (role to ping for games)')
                .setRequired(false))
        .addChannelOption(option =>
            option.setName('history_channel')
                .setDescription('History channel (for game logs/records)')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false))
        .addChannelOption(option =>
            option.setName('league_log_channel')
                .setDescription('League log channel (for league updates)')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false))
        .addChannelOption(option =>
            option.setName('sign_request_channel')
                .setDescription('Sign request channel (for recruitment)')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false))
        .addChannelOption(option =>
            option.setName('offer_accept_channel')
                .setDescription('Offer accept channel (for contract acceptances)')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false))
        .addRoleOption(option =>
            option.setName('staff_role')
                .setDescription('Staff role (can use staff commands)')
                .setRequired(false))
        .addRoleOption(option =>
            option.setName('manager_role')
                .setDescription('Manager role (can manage lineups, awards, etc.)')
                .setRequired(false))
        .addRoleOption(option =>
            option.setName('anchor_role')
                .setDescription('Anchor role (team anchor/leader role)')
                .setRequired(false)),
    
    async execute(interaction) {
        // Respond immediately to avoid timeout
        await interaction.reply({ 
            content: '⏳ Setting up...', 
            ephemeral: true 
        });

        // Ensure guild exists in database
        await db.createGuild(interaction.guildId, interaction.guild.name);

        // Get all the options
        const gtRole = interaction.options.getRole('gt_role');
        const historyChannel = interaction.options.getChannel('history_channel');
        const leagueLogChannel = interaction.options.getChannel('league_log_channel');
        const signRequestChannel = interaction.options.getChannel('sign_request_channel');
        const offerAcceptChannel = interaction.options.getChannel('offer_accept_channel');
        const staffRole = interaction.options.getRole('staff_role');
        const managerRole = interaction.options.getRole('manager_role');
        const anchorRole = interaction.options.getRole('anchor_role');

        // Check if at least one option was provided
        if (!gtRole && !historyChannel && !leagueLogChannel && !signRequestChannel && 
            !offerAcceptChannel && !staffRole && !managerRole && !anchorRole) {
            return interaction.editReply({
                content: null,
                embeds: [errorEmbed('No Changes', 'Please provide at least one option to configure.')]
            });
        }

        const updates = [];

        // Update channels
        if (historyChannel) {
            await db.setGuildChannel(interaction.guildId, 'history', historyChannel.id);
            updates.push(`📜 History Channel: ${historyChannel}`);
        }
        if (leagueLogChannel) {
            await db.setGuildChannel(interaction.guildId, 'league_log', leagueLogChannel.id);
            updates.push(`📋 League Log Channel: ${leagueLogChannel}`);
        }
        if (signRequestChannel) {
            await db.setGuildChannel(interaction.guildId, 'sign_request', signRequestChannel.id);
            updates.push(`✍️ Sign Request Channel: ${signRequestChannel}`);
        }
        if (offerAcceptChannel) {
            await db.setGuildChannel(interaction.guildId, 'offer_accept', offerAcceptChannel.id);
            updates.push(`✅ Offer Accept Channel: ${offerAcceptChannel}`);
        }

        // Update roles
        if (gtRole) {
            await db.setGuildRole(interaction.guildId, 'gt_role', gtRole.id);
            updates.push(`🎮 Game Time Role: ${gtRole}`);
        }
        if (staffRole) {
            await db.setGuildRole(interaction.guildId, 'staff', staffRole.id);
            updates.push(`👮 Staff Role: ${staffRole}`);
        }
        if (managerRole) {
            await db.setGuildRole(interaction.guildId, 'manager', managerRole.id);
            updates.push(`👑 Manager Role: ${managerRole}`);
        }
        if (anchorRole) {
            await db.setGuildRole(interaction.guildId, 'anchor', anchorRole.id);
            updates.push(`⚓ Anchor Role: ${anchorRole}`);
        }

        // Mark setup as completed
        await db.updateGuildSetup(interaction.guildId, true);

        const embed = successEmbed(
            '✅ Setup Updated',
            `Successfully updated bot configuration:\n\n${updates.join('\n')}`
        );

        await interaction.editReply({ 
            content: null,
            embeds: [embed] 
        });
    }
};