// commands/premium.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('premium')
        .setDescription('View premium plans and pricing'),
    
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('💎 LockerRoom Bot Premium')
            .setDescription('Unlock exclusive features for your team and take your server to the next level!')
            .addFields(
                {
                    name: '💰 Pricing Plans',
                    value: 
                        '**Monthly** - $3/month\n' +
                        '**3 Months** - $6 (Save $3!)\n' +
                        '**Lifetime** - $10 (Best Value! 🔥)\n' +
                        '**Custom Commands** - $1-5 (Based on complexity)',
                    inline: false
                },
                {
                    name: '✨ Premium Features',
                    value: 
                        '• Auto-DM game times to team members\n' +
                        '• Custom commands for your bot only\n' +
                        '• Customizable bot name and avatar\n' +
                        '• DM all members with announcements\n' +
                        '• Priority support (faster response)\n' +
                        '• Early access to new features\n' +
                        '• Advanced data backup\n' +
                        '• Detailed usage statistics',
                    inline: false
                },
                {
                    name: '💳 Payment Methods',
                    value: 
                        '• CashApp\n' +
                        '• PayPal\n' +
                        '• Venmo\n' +
                        '• ~~Robux~~ (Coming Soon)',
                    inline: true
                },
                {
                    name: '🎁 Why Go Premium?',
                    value: 
                        '• Support development\n' +
                        '• Get exclusive features\n' +
                        '• Stand out from other servers\n' +
                        '• Lifetime option = One-time payment!',
                    inline: true
                },
                {
                    name: '🛒 How to Purchase',
                    value: 
                        'Click the **"Purchase Premium"** button below to join our Discord server.\n' +
                        'Create a ticket and our team will help you get started! 🎫',
                    inline: false
                }
            )
            .setColor('#FFD700') // Gold color
            .setThumbnail('https://chatgpt.com/backend-api/estuary/content?id=file_00000000ea90722f853f8da7edbdead0&ts=491618&p=fs&cid=1&sig=837fdb9258769dfc70910f34ff6a4119578e74f2b8123f3790288b740abd1785&v=0') // Optional: Add your bot's logo
            .setImage('https://chatgpt.com/backend-api/estuary/content?id=file_00000000ea90722f853f8da7edbdead0&ts=491618&p=fs&cid=1&sig=837fdb9258769dfc70910f34ff6a4119578e74f2b8123f3790288b740abd1785&v=0') // Optional: Add a premium banner
            .setFooter({ text: 'Made by Ghostie | Premium Support Available 24/7' })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Purchase Premium')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://discord.gg/BkFJuu7DbN')
                    .setEmoji('💎'),
                new ButtonBuilder()
                    .setLabel('View Demo')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://discord.gg/BkFJuu7DbN')
                    .setEmoji('🎬')
            );

        await interaction.reply({ 
            embeds: [embed],
            components: [row],
            ephemeral: false // Set to true if you want only the user to see it
        });
    }
};
