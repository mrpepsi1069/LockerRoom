// commands/gametime.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database');
const { errorEmbed, successEmbed } = require('../utils/embeds');
const { hasManagerPerms, checkPremium } = require('../utils/permissions');

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
                .setDescription('Game time (e.g., "8 PM EST")')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Role to ping')
                .setRequired(true)),

    async execute(interaction) {
        // Check manager permissions
        if (!await hasManagerPerms(interaction)) {
            return interaction.reply({
                embeds: [errorEmbed('Permission Denied', 'You need Manager role or higher!')],
                ephemeral: true
            });
        }

        const league = interaction.options.getString('league');
        const time = interaction.options.getString('time');
        const role = interaction.options.getRole('role');

        await interaction.deferReply({ ephemeral: true });

        // Initial embed
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

        // Buttons
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

        // Send message
        const message = await interaction.channel.send({
            content: `${role}`, // pings the role
            embeds: [embed],
            components: [row]
        });

        // Store gametime in DB
        try {
            await db.createGametime(
                interaction.guildId,
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

        const isPremium = await checkPremium(interaction.guildId);

        // DM all role members if premium
        if (isPremium) {
            try {
                const members = await interaction.guild.members.fetch();
                const roleMembers = members.filter(m => m.roles.cache.has(role.id) && !m.user.bot);

                let dmCount = 0;
                for (const [, member] of roleMembers) {
                    try {
                        await member.send({
                            embeds: [new EmbedBuilder()
                                .setTitle('⏰ Gametime Scheduled')
                                .setDescription(`New game time in **${interaction.guild.name}**!\n\n**League:** ${league}\n**Time:** ${time}\n\n[Respond Here](${message.url})`)
                                .setColor('#5865F2')
                            ]
                        });
                        dmCount++;
                    } catch (err) {
                        // User has DMs disabled
                    }
                }
                console.log(`✉️ Sent ${dmCount} DMs for gametime poll`);
            } catch (err) {
                console.error('Error DMing members:', err);
            }
        }

        const premiumNote = isPremium
            ? '\n✨ Premium: Players have been auto-DMed!'
            : '\n💎 Upgrade to Premium for auto-DM reminders!';

        await interaction.editReply({
            embeds: [successEmbed('Gametime Created', `Successfully created gametime poll for **${league}**${premiumNote}`)]
        });
    }
};