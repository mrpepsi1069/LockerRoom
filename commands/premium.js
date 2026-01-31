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
                    name: '### 💰 Custom LockerRoom Bot Pricing',
                    value: '**Monthly** - $3/month\n**3 Months** - $6 (Save $3!)\n**Lifetime** - $10\n**Custom Commands** - $1-5 (Based on complexity)',
                    inline: false
                },
                {
                    name: '### ✨ Premium Features',
                    value: '• Auto-DM game times to team members\n• Custom Commands to your bot only\n• Customizable bot name and PFP\n• DM all members with custom messages\n• Faster Priority support\n• Test Early and New Features',
                    inline: false
                },
                {
                    name: '### 💳 Payment Methods',
                    value: '• CashApp\n• PayPal\n• ~~Robux~~',
                    inline: false
                },
                {
                    name: '### 🛒 How to Purchase',
                    value: 'Click the button below to join our Discord server and create a ticket!',
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
