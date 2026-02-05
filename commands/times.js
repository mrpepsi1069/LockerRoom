// commands/times.js - With individual time options
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { hasManagerPerms } = require('../utils/permissions');
const { successEmbed, errorEmbed } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('times')
        .setDescription('Create a poll for multiple time options')
        .addStringOption(option =>
            option.setName('league')
                .setDescription('League name/abbreviation')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Role to ping')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('time1')
                .setDescription('Time option 1 (e.g., "7 PM EST")')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('time2')
                .setDescription('Time option 2 (e.g., "8 PM EST")')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('time3')
                .setDescription('Time option 3 (e.g., "9 PM EST")')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('time4')
                .setDescription('Time option 4 (optional)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('time5')
                .setDescription('Time option 5 (optional)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('time6')
                .setDescription('Time option 6 (optional)')
                .setRequired(false)),

    async execute(interaction) {
        try {
            if (!await hasManagerPerms(interaction)) {
                return interaction.reply({
                    embeds: [errorEmbed('Permission Denied', 'You need Manager role or higher!')],
                    ephemeral: true
                });
            }

            const league = interaction.options.getString('league');
            const role = interaction.options.getRole('role');

            // Collect all time options
            const times = [];
            for (let i = 1; i <= 6; i++) {
                const time = interaction.options.getString(`time${i}`);
                if (time) times.push(time);
            }

            console.log(`DEBUG - Times poll: ${times.length} options`);

            await interaction.deferReply({ ephemeral: true });

            // Build description
            let description = `**League:** ${league}\n\nSelect which times work for you:\n\n`;
            times.forEach((time) => {
                description += `🕐 **${time}**\n• None yet\n\n`;
            });

            const embed = new EmbedBuilder()
                .setTitle('⏰ Available Times Poll')
                .setDescription(description.trim())
                .setColor('#5865F2')
                .setFooter({ text: 'Click the buttons to select your available times' })
                .setTimestamp();

            // Create buttons
            const buttons = times.map((time, index) => 
                new ButtonBuilder()
                    .setCustomId(`times_${index}_${time.replace(/\s+/g, '_').substring(0, 50)}`)
                    .setLabel(time.length > 80 ? time.substring(0, 77) + '...' : time)
                    .setStyle(ButtonStyle.Primary)
            );

            // Split into rows (max 5 buttons per row)
            const rows = [];
            for (let i = 0; i < buttons.length; i += 5) {
                rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
            }

            // Send message
            try {
                const message = await interaction.channel.send({
                    content: `${role}`,
                    embeds: [embed],
                    components: rows
                });

                await interaction.editReply({
                    embeds: [successEmbed('Times Poll Created', `Created times poll for **${league}** with ${times.length} time options!`)]
                });

            } catch (sendError) {
                console.error('Error sending times poll:', sendError);
                
                if (sendError.code === 50001) {
                    return interaction.editReply({
                        embeds: [errorEmbed('Missing Permissions', 'I don\'t have permission to send messages in this channel!\n\nMake sure I have:\n• Send Messages\n• Embed Links\n• Mention Roles')]
                    });
                }

                throw sendError;
            }

        } catch (error) {
            console.error('TIMES COMMAND ERROR:', error);
            
            const errorMsg = {
                embeds: [errorEmbed('Error', `Failed to create times poll: ${error.message}`)],
                ephemeral: true
            };

            if (interaction.deferred) {
                await interaction.editReply(errorMsg);
            } else if (!interaction.replied) {
                await interaction.reply(errorMsg);
            }
        }
    }
};