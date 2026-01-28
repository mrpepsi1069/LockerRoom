// commands/gametime.js
const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require('discord.js');

const db = require('../database');
const { errorEmbed, successEmbed } = require('../utils/embeds');
const { hasManagerPerms, checkPremium } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gametime')
        .setDescription('Create a game-time attendance poll')
        .addStringOption(option =>
            option.setName('league')
                .setDescription('League abbreviation')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Role to ping')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('time1')
                .setDescription('First time option (e.g., "8 PM EST")')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('time2')
                .setDescription('Second time option')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('time3')
                .setDescription('Third time option')
                .setRequired(false)),

    async execute(interaction) {
        // Permission check
        if (!await hasManagerPerms(interaction)) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        'Permission Denied',
                        'You need Manager role or higher to use this command.'
                    )
                ],
                ephemeral: true
            });
        }

        const leagueAbbr = interaction.options.getString('league').toUpperCase();
        const role = interaction.options.getRole('role');
        const time1 = interaction.options.getString('time1');
        const time2 = interaction.options.getString('time2');
        const time3 = interaction.options.getString('time3');

        // Fetch league
        const league = await db.getLeagueByAbbr(interaction.guildId, leagueAbbr);
        if (!league) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        'League Not Found',
                        `League with abbreviation **${leagueAbbr}** does not exist.\nUse \`/league-add\` first.`
                    )
                ],
                ephemeral: true
            });
        }

        // Build time options
        const timeOptions = [time1];
        if (time2) timeOptions.push(time2);
        if (time3) timeOptions.push(time3);

        // Create embed
        const embed = new EmbedBuilder()
            .setTitle(`🎮 ${league.league_name} Game Time Poll`)
            .setDescription(
                `${role}\n\n` +
                `**Which time works best for you?**\n\n` +
                timeOptions.map((t, i) => `${i + 1}️⃣ ${t}`).join('\n') +
                `\n\nReact below!`
            )
            .setColor('#5865F2')
            .setTimestamp();

        // Create buttons
        const buttons = timeOptions.map((time, index) =>
            new ButtonBuilder()
                .setCustomId(`gametime_${index}`)
                .setLabel(time)
                .setStyle(ButtonStyle.Primary)
                .setEmoji(`${index + 1}️⃣`)
        );

        const row = new ActionRowBuilder().addComponents(buttons);

        // ✅ REPLY TO THE INTERACTION (NO FAILURE)
        await interaction.reply({
            content: `${role}`,
            embeds: [embed],
            components: [row],
            allowedMentions: { roles: [role.id] }
        });

        // Fetch message for DB storage
        const message = await interaction.fetchReply();

        // Save to database
        await db.createGametime(
            interaction.guildId,
            league._id,
            new Date(),
            message.id,
            interaction.channelId,
            role.id,
            interaction.user.id
        );

        // Premium check
        const isPremium = await checkPremium(interaction.guildId);

        // Confirmation (ephemeral follow-up)
        await interaction.followUp({
            embeds: [
                successEmbed(
                    'Game Time Created',
                    `Poll created for **${league.league_name}**` +
                    (isPremium
                        ? '\n✨ Premium: Players will be auto-DMed!'
                        : '\n💎 Upgrade to Premium for auto-DM reminders!')
                )
            ],
            ephemeral: true
        });

        // Premium auto-DMs
        if (isPremium) {
            try {
                const members = await interaction.guild.members.fetch();
                const roleMembers = members.filter(
                    m => m.roles.cache.has(role.id) && !m.user.bot
                );

                for (const [, member] of roleMembers) {
                    try {
                        await member.send({
                            embeds: [
                                new EmbedBuilder()
                                    .setTitle(`🎮 ${league.league_name} Game Time Poll`)
                                    .setDescription(
                                        `A new game time poll was created in **${interaction.guild.name}**.\n\n` +
                                        `**Time Options:**\n` +
                                        timeOptions.map((t, i) => `${i + 1}️⃣ ${t}`).join('\n') +
                                        `\n\n[Jump to Poll](${message.url})`
                                    )
                                    .setColor('#5865F2')
                            ]
                        });
                    } catch {
                        console.log(`Could not DM ${member.user.tag}`);
                    }
                }
            } catch (err) {
                console.error('Error DMing members:', err);
            }
        }
    }
};
