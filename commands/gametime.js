// commands/gametime.js
const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const db = require('../database');
const { hasManagerPerms } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gametime')
        .setDescription('Create a gametime RSVP')
        .addStringOption(o =>
            o.setName('league')
                .setDescription('League abbreviation')
                .setRequired(true))
        .addStringOption(o =>
            o.setName('time')
                .setDescription('Game time')
                .setRequired(true))
        .addRoleOption(o =>
            o.setName('role')
                .setDescription('Role to ping')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        if (!await hasManagerPerms(interaction)) {
            return interaction.editReply('❌ You do not have permission.');
        }

        const league = interaction.options.getString('league').toUpperCase();
        const time = interaction.options.getString('time');
        const role = interaction.options.getRole('role');

        const embed = new EmbedBuilder()
            .setTitle('📅 Gametime Scheduled')
            .setDescription(
                `${role}\n\n` +
                `**League:** ${league}\n` +
                `**Time:** ${time}\n\n` +
                `✅ **Can Make (0)**\n*No responses yet*\n\n` +
                `❌ **Can't Make (0)**\n*No responses yet*\n\n` +
                `❓ **Unsure (0)**\n*No responses yet*`
            )
            .setColor(0x5865F2)
            .setFooter({ text: 'TGS | Gametime Manager' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('gt_yes')
                .setLabel('Yes')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('gt_no')
                .setLabel('No')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('gt_maybe')
                .setLabel('Unsure')
                .setStyle(ButtonStyle.Secondary)
        );

        const message = await interaction.channel.send({
            content: `${role}`,
            embeds: [embed],
            components: [row]
        });

        await db.createGametime({
            guildId: interaction.guildId,
            channelId: interaction.channelId,
            messageId: message.id,
            league,
            time,
            yes: [],
            no: [],
            maybe: []
        });

        await interaction.editReply('✅ Gametime created.');
    }
};
