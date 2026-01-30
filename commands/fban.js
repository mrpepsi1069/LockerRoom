// commands/fban.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fban')
        .setDescription('Fake ban a user (for fun)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to fake ban')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Fake reason')
                .setRequired(false)),
    
    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        const embed = new EmbedBuilder()
            .setTitle('👢 User Banned!')
            .setDescription(`**${user.tag}** has been banned from the server!`)
            .addFields({ name: 'Reason', value: reason })
            .setColor('#ED4245')
            .setFooter({ text: 'Just kidding! This is a fake ban.' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};