// commands/guilds.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../utils/embeds');
const { isOwner } = require('../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guilds')
        .setDescription('View all guilds the bot is in with invite links (Owner only)'),
    
    async execute(interaction) {
        // Check if owner
        if (!await isOwner(interaction.user.id)) {
            return interaction.reply({
                embeds: [errorEmbed('Permission Denied', 'This command is owner-only.')],
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        const guilds = interaction.client.guilds.cache;
        
        if (guilds.size === 0) {
            return interaction.editReply({
                embeds: [errorEmbed('No Guilds', 'The bot is not in any guilds.')]
            });
        }

        const guildList = [];

        for (const [guildId, guild] of guilds) {
            try {
                // Try to get an invite for the guild
                let inviteLink = 'No invite available';
                
                // Try to create an invite from the first available text channel
                const channel = guild.channels.cache.find(ch => 
                    ch.type === 0 && // GuildText
                    ch.permissionsFor(guild.members.me).has('CreateInstantInvite')
                );

                if (channel) {
                    try {
                        const invite = await channel.createInvite({ 
                            maxAge: 0, // Never expires
                            maxUses: 0, // Unlimited uses
                            reason: 'Guild list for bot owner'
                        });
                        inviteLink = `https://discord.gg/${invite.code}`;
                    } catch (err) {
                        inviteLink = 'Cannot create invite';
                    }
                }

                guildList.push({
                    name: guild.name,
                    id: guildId,
                    members: guild.memberCount,
                    owner: guild.ownerId,
                    invite: inviteLink
                });
            } catch (error) {
                console.error(`Error processing guild ${guild.name}:`, error);
            }
        }

        // Sort by member count (largest first)
        guildList.sort((a, b) => b.members - a.members);

        // Split into multiple embeds if too many guilds
        const chunkedGuilds = [];
        for (let i = 0; i < guildList.length; i += 10) {
            chunkedGuilds.push(guildList.slice(i, i + 10));
        }

        const embeds = chunkedGuilds.map((chunk, index) => {
            const embed = new EmbedBuilder()
                .setTitle(`📊 Bot Guilds (${index + 1}/${chunkedGuilds.length})`)
                .setDescription(`**Total Guilds:** ${guilds.size}\n**Total Members:** ${guilds.reduce((acc, g) => acc + g.memberCount, 0)}`)
                .setColor('#5865F2')
                .setTimestamp();

            chunk.forEach(guild => {
                embed.addFields({
                    name: `🏰 ${guild.name}`,
                    value: 
                        `**Guild ID:** \`${guild.id}\`\n` +
                        `**Members:** ${guild.members.toLocaleString()}\n` +
                        `**Owner ID:** \`${guild.owner}\`\n` +
                        `**Invite:** ${guild.invite}`,
                    inline: false
                });
            });

            embed.setFooter({ text: `LockerRoom | Page ${index + 1} of ${chunkedGuilds.length}` });

            return embed;
        });

        // Send first embed
        await interaction.editReply({ embeds: [embeds[0]] });

        // Send remaining embeds as follow-ups
        for (let i = 1; i < embeds.length; i++) {
            await interaction.followUp({ embeds: [embeds[i]], ephemeral: true });
        }
    }
};