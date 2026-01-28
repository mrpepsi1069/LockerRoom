// commands/invite.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Get the bot invite link'),
    
    async execute(interaction) {
        const inviteLink = `https://discord.com/api/oauth2/authorize?client_id=${interaction.client.user.id}&permissions=8&scope=bot%20applications.commands`;
        
        const embed = new EmbedBuilder()
            .setTitle('📨 Invite LockerRoom Bot')
            .setDescription(`Click the link below to invite me to your server!\n\n[Invite Bot](${inviteLink})`)
            .setColor('#5865F2')
            .setFooter({ text: 'By Ghostie' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
};