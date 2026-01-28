// commands/change-botname.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../utils/embeds');
const { checkPremium } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('change-botname')
        .setDescription('Change the bot\'s name in this server (Premium)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('name')
                .setDescription('New bot name')
                .setRequired(true)
                .setMaxLength(32)),
    
    async execute(interaction) {
        // Check premium
        const isPremium = await checkPremium(interaction.guildId);
        if (!isPremium) {
            return interaction.reply({
                embeds: [errorEmbed('Premium Required', 'This feature requires Premium!\nContact the bot owner to upgrade.')],
                ephemeral: true
            });
        }

        const newName = interaction.options.getString('name');

        try {
            const member = await interaction.guild.members.fetch(interaction.client.user.id);
            await member.setNickname(newName);

            await interaction.reply({
                embeds: [successEmbed('Bot Name Changed', `Successfully changed bot name to **${newName}**`)],
                ephemeral: true
            });
        } catch (error) {
            await interaction.reply({
                embeds: [errorEmbed('Failed', 'Could not change bot name. Make sure the bot has permission to change its nickname.')],
                ephemeral: true
            });
        }
    }
};