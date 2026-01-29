// commands/suggest.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');
const { successEmbed } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('suggest')
        .setDescription('Submit a suggestion')
        .addStringOption(option =>
            option.setName('suggestion')
                .setDescription('Your suggestion')
                .setRequired(true)
                .setMaxLength(1000)),
    
    async execute(interaction) {
        const suggestion = interaction.options.getString('suggestion');
        const suggestionChannelId = '1466284506385219686';

        // Save to database
        await db.createSuggestion(interaction.guildId, interaction.user.id, suggestion);

        // Send to suggestions channel
        try {
            const channel = await interaction.client.channels.fetch(suggestionChannelId);
            
            if (channel) {
                const suggestionEmbed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle('New Suggestion')
                    .setDescription(suggestion)
                    .setAuthor({
                        name: interaction.user.tag,
                        iconURL: interaction.user.displayAvatarURL()
                    })
                    .setTimestamp()
                    .setFooter({ text: `User ID: ${interaction.user.id}` });

                const message = await channel.send({ embeds: [suggestionEmbed] });
                
                // Add reaction emojis for voting
                await message.react('👍');
                await message.react('👎');
            }
        } catch (error) {
            console.error('Error sending suggestion to channel:', error);
        }

        await interaction.reply({
            embeds: [successEmbed('Suggestion Submitted', 'Thank you for your suggestion! The server admins will review it.')],
            ephemeral: true
        });
    }
};