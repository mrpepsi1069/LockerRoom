// commands/league-add.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');
const { successEmbed, errorEmbed } = require('../utils/embeds');
const { hasManagerPerms } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('league-add')
        .setDescription('Post league recruitment (Manager only)')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('League name')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('abbreviation')
                .setDescription('League abbreviation (e.g., VPL, CCL)')
                .setRequired(true)
                .setMaxLength(10))
        .addStringOption(option =>
            option.setName('signup_link')
                .setDescription('Sign-up link')
                .setRequired(false)),
    
    async execute(interaction) {
        // Check permissions
        if (!await hasManagerPerms(interaction)) {
            return interaction.reply({ 
                embeds: [errorEmbed('Permission Denied', 'You need Manager role or higher to use this command.')], 
                ephemeral: true 
            });
        }

        const name = interaction.options.getString('name');
        const abbr = interaction.options.getString('abbreviation').toUpperCase();
        const signupLink = interaction.options.getString('signup_link');

        try {
            // Create league
            const league = await db.createLeague(interaction.guildId, name, abbr, signupLink);

            // Create recruitment embed
            const embed = new EmbedBuilder()
                .setTitle(`🏆 ${name} Recruitment`)
                .setDescription(`**League:** ${name} (${abbr})\n\nWe're now recruiting players!${signupLink ? `\n\n[Sign Up Here](${signupLink})` : ''}`)
                .setColor('#5865F2')
                .setFooter({ text: 'React below if interested!' })
                .setTimestamp();

            // Post to sign request channel if configured
            const channels = await db.getGuildChannels(interaction.guildId);
            if (channels.sign_request) {
                const channel = await interaction.guild.channels.fetch(channels.sign_request);
                if (channel) {
                    await channel.send({ embeds: [embed] });
                }
            } else {
                // Post to current channel
                await interaction.channel.send({ embeds: [embed] });
            }

            await interaction.reply({
                embeds: [successEmbed('League Added', `Successfully created league **${name}** (${abbr})`)],
                ephemeral: true
            });
        } catch (error) {
            console.error('League add error:', error);
            await interaction.reply({
                embeds: [errorEmbed('Failed', 'A league with that abbreviation already exists.')],
                ephemeral: true
            });
        }
    }
};