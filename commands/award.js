// commands/award.js
const { SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const { successEmbed, errorEmbed } = require('../utils/embeds');
const { hasManagerPerms } = require('../utils/permissions');
const { sanitizeInput, validateSeason } = require('../utils/validation');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('award')
        .setDescription('Give an individual award to a player')
        .addStringOption(option =>
            option.setName('league')
                .setDescription('League abbreviation')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('award')
                .setDescription('Award name (e.g., MVP, Rookie of the Year)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('season')
                .setDescription('Season (e.g., S1, 2024)')
                .setRequired(true))
        .addUserOption(option =>
            option.setName('member')
                .setDescription('Player to award')
                .setRequired(true)),
    
    async execute(interaction) {
        // Check permissions
        if (!await hasManagerPerms(interaction)) {
            return interaction.reply({ 
                embeds: [errorEmbed('Permission Denied', 'You need Manager role or higher to use this command.')], 
                ephemeral: true 
            });
        }

        const leagueAbbr = interaction.options.getString('league').toUpperCase();
        const awardName = sanitizeInput(interaction.options.getString('award'), 100);
        const season = sanitizeInput(interaction.options.getString('season'), 20);
        const member = interaction.options.getUser('member');

        // Validate season
        if (!validateSeason(season)) {
            return interaction.reply({
                embeds: [errorEmbed('Invalid Season', 'Season must be between 1-20 characters.')],
                ephemeral: true
            });
        }

        // Get league
        const league = await db.getLeagueByAbbr(interaction.guildId, leagueAbbr);
        if (!league) {
            return interaction.reply({
                embeds: [errorEmbed('League Not Found', `League with abbreviation **${leagueAbbr}** does not exist.\nUse \`/league-add\` to create it first.`)],
                ephemeral: true
            });
        }

        // Ensure user exists in database
        await db.createOrUpdateUser(member.id, member.username);

        // Add award
        const award = await db.addAward(
            interaction.guildId,
            league.id,
            member.id,
            awardName,
            season,
            interaction.user.id
        );

        if (!award) {
            return interaction.reply({
                embeds: [errorEmbed('Award Already Exists', `<@${member.id}> already has the **${awardName}** award for **${league.league_name} ${season}**.`)],
                ephemeral: true
            });
        }

        // Post to awards channel if configured
        const channels = await db.getGuildChannels(interaction.guildId);
        
        const embed = successEmbed(
            `🏆 ${awardName}`,
            `**${league.league_name} - ${season}**\n\nCongratulations to <@${member.id}> for winning **${awardName}**!`
        );

        if (channels.awards) {
            const awardsChannel = await interaction.guild.channels.fetch(channels.awards);
            if (awardsChannel) {
                await awardsChannel.send({ embeds: [embed] });
            }
        }

        await interaction.reply({
            embeds: [successEmbed('Award Given', `Successfully gave **${awardName}** to <@${member.id}> for **${league.league_name} ${season}**`)],
            ephemeral: true
        });
    }
};