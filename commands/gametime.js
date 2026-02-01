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
        await db.createGametime(
            interaction.guildId,
            time,
            new Date(),
            message.id,
            interaction.channelId,
            role.id,
            interaction.user.id
        );

        const isPremium = await checkPremium(interaction.guildId);

        // DM all role members if premium
        if (isPremium) {
            try {
                const members = await interaction.guild.members.fetch();
                const roleMembers = members.filter(m => m.roles.cache.has(role.id) && !m.user.bot);

                for (const [, member] of roleMembers) {
                    try {
                        await member.send({
                            embeds: [new EmbedBuilder()
                                .setTitle('⏰ Gametime Scheduled')
                                .setDescription(`New game time in **${interaction.guild.name}**!\n\n**League:** ${league}\n**Time:** ${time}\n\n[Respond Here](${message.url})`)
                                .setColor('#5865F2')
                            ]
                        });
                    } catch (err) {
                        console.log(`Could not DM ${member.user.tag}`);
                    }
                }
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

        // Collector to handle button clicks
        const collector = message.createMessageComponentCollector({ time: 7 * 24 * 60 * 60 * 1000 }); // 7 days

        // Map of arrays for each response
        const selections = {
            yes: new Set(),
            no: new Set(),
            unsure: new Set()
        };

        collector.on('collect', async i => {
            const userId = i.user.id;
            const username = `<@${userId}>`;

            // Remove user from all sets first
            selections.yes.delete(username);
            selections.no.delete(username);
            selections.unsure.delete(username);

            // Add to correct set
            if (i.customId === 'gametime_yes') selections.yes.add(username);
            else if (i.customId === 'gametime_no') selections.no.add(username);
            else if (i.customId === 'gametime_unsure') selections.unsure.add(username);

            // Update embed
            const formatList = (set) => set.size > 0 ? Array.from(set).join('\n• ') : '• None yet';

            const updatedEmbed = EmbedBuilder.from(embed).setFields(
                { name: `✅ Can Make (${selections.yes.size})`, value: formatList(selections.yes), inline: false },
                { name: `❌ Can't Make (${selections.no.size})`, value: formatList(selections.no), inline: false },
                { name: `❓ Unsure (${selections.unsure.size})`, value: formatList(selections.unsure), inline: false }
            );

            await message.edit({ embeds: [updatedEmbed], components: [row] });

            await i.reply({
                content: `✅ Response recorded: **${i.customId === 'gametime_yes' ? 'Can Make' : i.customId === 'gametime_no' ? "Can't Make" : 'Unsure'}**`,
                ephemeral: true
            });
        });
    }
};
