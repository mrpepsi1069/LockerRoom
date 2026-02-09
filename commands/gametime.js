// commands/gametime.js - COMPLETE VERSION
const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    PermissionFlagsBits
} = require('discord.js');

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
                .setDescription('Game time (e.g., 8 PM EST)')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Role to ping')
                .setRequired(true)),

    async execute(interaction) {

        if (!await hasCoachPerms(interaction)) {
            return interaction.reply({
                embeds: [errorEmbed('Permission Denied', 'You need Coach role or higher!')],
                flags: 64
            });
        }

        const league = interaction.options.getString('league');
        const time = interaction.options.getString('time');
        const role = interaction.options.getRole('role');

        await interaction.deferReply({ flags: 64 });

        const channel = interaction.channel;

        if (!channel || !channel.isTextBased()) {
            return interaction.editReply({
                content: "❌ Invalid channel.",
                flags: 64
            });
        }

        const botMember = interaction.guild.members.me;
        const perms = channel.permissionsFor(botMember);

        if (!perms.has([
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.EmbedLinks
        ])) {
            return interaction.editReply({
                content: "❌ I don't have permission to send messages here.",
                flags: 64
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('⏰ Gametime Scheduled')
            .setDescription(`**League:** ${league}\n**Time:** ${time}`)
            .addFields(
                { name: '✅ Can Make (0)', value: '• None yet' },
                { name: "❌ Can't Make (0)", value: '• None yet' },
                { name: '❓ Unsure (0)', value: '• None yet' }
            )
            .setColor('#5865F2')
            .setFooter({ text: 'LockerRoom | Gametime Manager' })
            .setTimestamp();

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

        let message;
        try {
            message = await channel.send({
                content: `<@&${role.id}>`,
                allowedMentions: { roles: [role.id] },
                embeds: [embed],
                components: [row]
            });
        } catch (err) {
            console.error("Send error:", err);
            return interaction.editReply({
                content: "❌ Failed to send poll. Check my permissions.",
                flags: 64
            });
        }

        const jumpLink =
            `https://discord.com/channels/${interaction.guildId}/${interaction.channelId}/${message.id}`;

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
        } catch (err) {
            console.log('DB error:', err);
        }

        let dmCount = 0;

        try {
            const members = await interaction.guild.members.fetch();
            const roleMembers = members.filter(
                m => m.roles.cache.has(role.id) && !m.user.bot
            );

            for (const [, member] of roleMembers) {
                try {
                    const dmEmbed = new EmbedBuilder()
                        .setAuthor({
                            name: interaction.guild.name,
                            iconURL: interaction.guild.iconURL({ dynamic: true })
                        })
                        .setTitle('📅 Gametime Attendance')
                        .setDescription(
                            `**League:** ${league}\n` +
                            `**Time:** ${time}\n\nCan you make it?`
                        )
                        .addFields({
                            name: '🔗 Jump to Poll',
                            value: `[Click Here](${jumpLink})`
                        })
                        .setColor('#5865F2')
                        .setTimestamp();

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
                    await new Promise(r => setTimeout(r, 800));

                } catch {
                    console.log(`Couldn't DM ${member.user.tag}`);
                }
            }

        } catch (err) {
            console.log("DM fetch error:", err);
        }

        await interaction.editReply({
            embeds: [successEmbed(
                'Gametime Created',
                `✅ Poll created for **${league}**\n📨 ${dmCount} DMs sent\n⏰ ${time}`
            )]
        });
    }
};