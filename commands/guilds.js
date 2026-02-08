// commands/guilds.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { hasOwnerPerms } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guilds')
        .setDescription('View all servers the bot is in'),

    async execute(interaction) {

        // ✅ Permission check
        if (!await hasOwnerPerms(interaction)) {
            return interaction.reply({
                content: '❌ You do not have permission to use this.',
                flags: 64
            });
        }

        // ✅ Build guild list
        const guilds = interaction.client.guilds.cache;

        const guildList = guilds.map(g =>
            `**${g.name}**\nID: ${g.id}\nMembers: ${g.memberCount}`
        ).join('\n\n');

        const embed = new EmbedBuilder()
            .setTitle('📊 Bot Guilds')
            .setDescription(guildList.slice(0, 4000)) // prevent embed limit
            .setColor('#5865F2')
            .setFooter({ text: `Total Servers: ${guilds.size}` })
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            flags: 64
        });
    }
};
