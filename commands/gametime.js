// commands/gametime.js - Updated with auto-DM and synchronized voting
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database');
const { errorEmbed, successEmbed } = require('../utils/embeds');
const { hasCoachPerms } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gametime')
        .setDescription('Create a game-time attendance poll')
        .addStringOption(option =>
            option.setName('league')
                .setDescription('League name/abbreviation')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('time')
                .setDescription('Game time (e.g., "8 PM EST", "10")')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Role to ping')
                .setRequired(true)),

    async execute(interaction) {
        // Check coach permissions
        if (!await hasCoachPerms(interaction)) {
            return interaction.reply({
                embeds: [errorEmbed('Permission Denied', 'You need Coach role or higher!')],
                ephemeral: true
            });
        }

        const league = interaction.options.getString('league');
        const time = interaction.options.getString('time');
        const role = interaction.options.getRole('role');

        await interaction.deferReply({ ephemeral: true });

        // Initial embed for channel
        const embed = new EmbedBuilder()
            .setTitle('⏰ Gametime Scheduled')
            .setDescription(`**League:** ${league}\n**Time:** ${time}`)
            .addFields(
                { name: '✅ Can Make (0)', value: '• None yet', inline: false },
                { name: '❌ Can\'t Make (0)', value: '• None yet', inline: false },
                { name: '❓ Unsure (0)', value: '• None yet', inline: false }
            )
            .setColor('#5865F2')
            .setFooter({ text: 'LockerRoom | Gametime Manager' })
            .setTimestamp();

        // Buttons for channel message
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('gametime_yes')
                    .setLabel('Yes')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId('gametime_no')
                    .setLabel('No')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌'),
                new ButtonBuilder()
                    .setCustomId('gametime_unsure')
                    .setLabel('Unsure')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('❓')
            );

        // Send message to channel
        const message = await interaction.channel.send({
            content: `${role}`, // pings the role
            embeds: [embed],
            components: [row]
        });

        // Store gametime in DB
        try {
            await db.createGametime(
                interaction.guildId,
                league,
                time,
                new Date(),
                message.id,
                interaction.channelId,
                role.id,
                interaction.user.id
            );
        } catch (error) {
            console.log('Error saving gametime to DB:', error);
        }

        // DM all role members with interactive buttons
        try {
            const members = await interaction.guild.members.fetch();
            const roleMembers = members.filter(m => m.roles.cache.has(role.id) && !m.user.bot);

            let dmCount = 0;
            for (const [, member] of roleMembers) {
                try {
                    // Create DM embed matching the screenshot
                    const dmEmbed = new EmbedBuilder()
                        .setAuthor({ 
                            name: interaction.guild.name,
                            iconURL: interaction.guild.iconURL({ dynamic: true })
                        })
                        .setTitle('📅 Gametime Attendance')
                        .setDescription(
                            `**League:** ${league}\n` +
                            `**Time:** ${time}\n\n` +
                            `Can you make it?`
                        )
                        .setColor('#5865F2')
                        .setFooter({ text: 'LockerRoom Bot' })
                        .setTimestamp();

                    // Buttons for DM (same customId so they update the main poll)
                    const dmButtons = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`gametime_yes_${message.id}`)
                                .setLabel('Yes')
                                .setStyle(ButtonStyle.Success),
                            new ButtonBuilder()
                                .setCustomId(`gametime_no_${message.id}`)
                                .setLabel('No')
                                .setStyle(ButtonStyle.Danger),
                            new ButtonBuilder()
                                .setCustomId(`gametime_unsure_${message.id}`)
                                .setLabel('Unsure')
                                .setStyle(ButtonStyle.Secondary)
                        );

                    await member.send({
                        embeds: [dmEmbed],
                        components: [dmButtons]
                    });
                    dmCount++;
                    
                    // Small delay to avoid rate limits
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (err) {
                    console.log(`Could not DM ${member.user.tag}`);
                }
            }
            console.log(`✉️ Sent ${dmCount} DM notifications for gametime poll`);

            await interaction.editReply({
                embeds: [successEmbed(
                    'Gametime Created', 
                    `✅ Created gametime poll for **${league}**\n` +
                    `📨 Sent ${dmCount} DM notifications\n` +
                    `⏰ Time: ${time}`
                )]
            });

        } catch (err) {
            console.error('Error sending DMs:', err);
            await interaction.editReply({
                embeds: [successEmbed(
                    'Gametime Created', 
                    `✅ Created gametime poll for **${league}**\n` +
                    `⚠️ Some DMs could not be sent (users have DMs disabled)`
                )]
            });
        }
    }
};