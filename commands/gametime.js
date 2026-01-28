// commands/gametime.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require(‘discord.js’);
const db = require(’../database’);
const { errorEmbed, successEmbed } = require(’../utils/embeds’);
const { hasManagerPerms, checkPremium } = require(’../utils/permissions’);

module.exports = {
data: new SlashCommandBuilder()
.setName(‘gametime’)
.setDescription(‘Create a game-time attendance poll’)
.addStringOption(option =>
option.setName(‘league’)
.setDescription(‘League name/abbreviation’)
.setRequired(true))
.addStringOption(option =>
option.setName(‘time’)
.setDescription(‘Game time (e.g., “8 PM EST”, “10”)’)
.setRequired(true))
.addRoleOption(option =>
option.setName(‘role’)
.setDescription(‘Role to ping’)
.setRequired(true)),

```
async execute(interaction) {
    // Check permissions
    if (!await hasManagerPerms(interaction)) {
        return interaction.reply({ 
            embeds: [errorEmbed('Permission Denied', 'You need Manager role or higher to use this command.')], 
            ephemeral: true 
        });
    }

    const league = interaction.options.getString('league');
    const time = interaction.options.getString('time');
    const role = interaction.options.getRole('role');

    await interaction.deferReply({ ephemeral: true });

    // Create embed
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

    // Create buttons
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

    // Send the message
    const message = await interaction.channel.send({
        content: `${role}`,
        embeds: [embed],
        components: [row]
    });

    // Save to database
    await db.createGametime(
        interaction.guildId,
        null, // No league ID needed for this simple version
        new Date(),
        message.id,
        interaction.channelId,
        role.id,
        interaction.user.id
    );

    // Check if premium for auto-DM
    const isPremium = await checkPremium(interaction.guildId);
    
    if (isPremium) {
        try {
            const members = await interaction.guild.members.fetch();
            const roleMembers = members.filter(m => m.roles.cache.has(role.id) && !m.user.bot);
            
            for (const [, member] of roleMembers) {
                try {
                    await member.send({
                        embeds: [new EmbedBuilder()
                            .setTitle('⏰ Gametime Scheduled')
                            .setDescription(`A new game time has been scheduled in **${interaction.guild.name}**!\n\n**League:** ${league}\n**Time:** ${time}\n\n[Respond Here](${message.url})`)
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
}
```

};