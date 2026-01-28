// commands/premium.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('premium')
        .setDescription('View premium plans and pricing'),
    
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('💎 LockerRoom Bot Premium')
            .setDescription('Unlock exclusive features for your team!')
            .addFields(
                {
                    name: '✨ Premium Features',
                    value: '• Auto-DM game times to team members\n• Custom bot profile picture\n• Custom bot name in your server\n• DM all members with custom messages\n• Priority support\n• More features coming soon!',
                    inline: false
                },
                {
                    name: '💰 Pricing Plans',
                    value: '**Monthly** - $1/month\n**6 Months** - $5 (Save $1!)\n**Lifetime** - $10 (Best Value!)',
                    inline: false
                },
                {
                    name: '💳 Payment Methods',
                    value: '• CashApp\n• PayPal',
                    inline: false
                },
                {
                    name: '🛒 How to Purchase',
                    value: 'Click the button below to join our Discord server and purchase premium!',
                    inline: false
                }
            )
            .setColor('#FFD700')
            .setFooter({ text: 'By Ghostie' })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Purchase Premium')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://discord.gg/BkFJuu7DbN')
                    .setEmoji('💎')
            );

        await interaction.reply({ 
            embeds: [embed],
            components: [row]
        });
    }
};