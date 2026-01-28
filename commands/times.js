// commands/times.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { hasManagerPerms } = require('../utils/permissions');
const { errorEmbed } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('times')
        .setDescription('Post multiple game time options (Manager only)')
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Role to ping')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('time1')
                .setDescription('First time option')
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
                .setRequired(false))
        .addStringOption(option =>
            option.setName('league')
                .setDescription('League name')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Additional message')
                .setRequired(false)),
    
    async execute(interaction) {
        // Check permissions
        if (!await hasManagerPerms(interaction)) {
            return interaction.reply({ 
                embeds: [errorEmbed('Permission Denied', 'You need Manager role or higher to use this command.')], 
                ephemeral: true 
            });
        }

        const role = interaction.options.getRole('role');
        const league = interaction.options.getString('league') || 'Game';
        const customMessage = interaction.options.getString('message') || '';

        // Collect all time options
        const times = [];
        for (let i = 1; i <= 5; i++) {
            const time = interaction.options.getString(`time${i}`);
            if (time) times.push(time);
        }

        // Create embed
        const embed = new EmbedBuilder()
            .setTitle(`🎮 ${league} - Time Options`)
            .setDescription(`${role}${customMessage ? `\n\n${customMessage}` : ''}\n\n**Which time works best?**\n\n${times.map((t, i) => `${i + 1}️⃣ ${t}`).join('\n')}`)
            .setColor('#5865F2')
            .setTimestamp();

        const message = await interaction.channel.send({ embeds: [embed] });

        // Add reactions
        const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
        for (let i = 0; i < times.length; i++) {
            await message.react(emojis[i]);
        }

        await interaction.reply({
            content: 'Time poll posted!',
            ephemeral: true
        });
    }
};