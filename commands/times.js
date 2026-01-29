// commands/times.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { hasManagerPerms } = require('../utils/permissions');
const { errorEmbed, successEmbed } = require('../utils/embeds');
const db = require('../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('times')
        .setDescription('Post multiple game time options (Manager only)')
        .addStringOption(option =>
            option.setName('league')
                .setDescription('League name')
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
                .setRequired(true))
        .addStringOption(option =>
            option.setName('time3')
                .setDescription('Third time option')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('time4')
                .setDescription('Fourth time option')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('time5')
                .setDescription('Fifth time option')
                .setRequired(false)),
    
    async execute(interaction) {
        // Check permissions
        if (!await hasManagerPerms(interaction)) {
            return interaction.reply({ 
                embeds: [errorEmbed('Permission Denied', 'You need Manager role or higher to use this command.')], 
                ephemeral: true 
            });
        }

        const league = interaction.options.getString('league');
        const role = interaction.options.getRole('role');

        // Collect all time options
        const times = [];
        for (let i = 1; i <= 5; i++) {
            const time = interaction.options.getString(`time${i}`);
            if (time) times.push(time);
        }

        await interaction.deferReply({ ephemeral: true });

        // Initialize selections storage
        const selections = {};
        times.forEach((time, index) => {
            selections[index] = new Set();
        });

        // Build embed description with time sections
        let description = `**League:** ${league}\n\n`;
        times.forEach(time => {
            description += `🕐 **${time}**\n• None yet\n\n`;
        });

        // Create embed
        const embed = new EmbedBuilder()
            .setTitle('⏰ Pick a time for gametime nigger')
            .setDescription(description.trim())
            .setColor('#5865F2')
            .setFooter({ text: 'LockerRoom | Gametime Manager • You can select multiple times' })
            .setTimestamp();

        // Create buttons for each time (max 5)
        const buttons = times.map((time, index) => 
            new ButtonBuilder()
                .setCustomId(`times_${index}_${time}`)
                .setLabel(time)
                .setStyle(ButtonStyle.Primary)
        );

        const row = new ActionRowBuilder().addComponents(buttons);

        // Send the message
        const message = await interaction.channel.send({
            content: `${role}`,
            embeds: [embed],
            components: [row]
        });

        // Store the message data for the collector
        const collector = message.createMessageComponentCollector({ 
            time: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        collector.on('collect', async i => {
            const [cmd, timeIndex, timeLabel] = i.customId.split('_');
            const userId = i.user.id;
            const index = parseInt(timeIndex);

            // Toggle user selection
            if (selections[index].has(userId)) {
                selections[index].delete(userId);
            } else {
                selections[index].add(userId);
            }

            // Update embed description
            let newDescription = `**League:** ${league}\n\n`;
            times.forEach((time, idx) => {
                newDescription += `🕐 **${time}**\n`;
                if (selections[idx].size === 0) {
                    newDescription += `• None yet\n\n`;
                } else {
                    const users = Array.from(selections[idx]).map(id => `<@${id}>`).join(', ');
                    newDescription += `• ${users}\n\n`;
                }
            });

            // Update buttons to show selected state
            const updatedButtons = times.map((time, idx) => 
                new ButtonBuilder()
                    .setCustomId(`times_${idx}_${time}`)
                    .setLabel(time)
                    .setStyle(selections[idx].has(userId) ? ButtonStyle.Success : ButtonStyle.Primary)
            );

            const updatedRow = new ActionRowBuilder().addComponents(updatedButtons);

            const updatedEmbed = new EmbedBuilder()
                .setTitle('⏰ Pick a time for gametime nigger')
                .setDescription(newDescription.trim())
                .setColor('#5865F2')
                .setFooter({ text: 'LockerRoom | Gametime Manager • You can select multiple times' })
                .setTimestamp();

            await i.update({
                embeds: [updatedEmbed],
                components: [updatedRow]
            });
        });

        await interaction.editReply({
            embeds: [successEmbed('Times Poll Created', `Successfully created times poll for **${league}**\nPlayers can select multiple time options.`)]
        });
    }
};

