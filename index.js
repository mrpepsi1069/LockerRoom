// index.js - COMPLETE WITH ALL FIXES
require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Events, ActivityType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const db = require('./database');
const http = require('http');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
    ]
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`✅ Loaded command: ${command.data.name}`);
    }
}

client.once(Events.ClientReady, async () => {
    console.log(`🤖 ${client.user.tag} is online`);
    console.log(`📊 Servers: ${client.guilds.cache.size}`);
    client.user.setActivity('your team | /help', { type: ActivityType.Watching });
    await db.initialize();
});

client.on(Events.InteractionCreate, async interaction => {
    if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        if (!command || !command.autocomplete) return;
        try {
            await command.autocomplete(interaction);
        } catch (error) {
            console.error(`Autocomplete error:`, error);
        }
        return;
    }

    if (interaction.isButton()) {
        if (interaction.customId.startsWith('gametime_')) {
            await handleGametimeButton(interaction);
        } else if (interaction.customId.startsWith('times_')) {
            await handleTimesButton(interaction);
        } else if (interaction.customId.startsWith('contract_')) {
            await handleContractButton(interaction);
        } else if (interaction.customId.startsWith('league_signup_')) {
            await handleLeagueSignupButton(interaction);
        }
        return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        if (db) {
            await db.logCommand(interaction.commandName, interaction.guildId, interaction.user.id);
        }
        await command.execute(interaction);
    } catch (error) {
        console.error(`❌ Command error:`, error);
        const errorMessage = { content: '❌ Error executing command!', flags: 64 };
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
});

client.on(Events.GuildCreate, async guild => {
    console.log(`✅ Joined: ${guild.name}`);
    await db.createGuild(guild.id, guild.name);
});

client.on('error', error => {
    console.error('❌ Discord client error:', error);
});

const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const url = req.url;

    if (url === '/' || url === '/api/stats') {
        const stats = {
            status: 'online',
            bot: client.user?.tag || 'Starting',
            guilds: client.guilds.cache.size,
            users: client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0),
            uptime: Math.floor(process.uptime()),
            version: '1.0.0'
        };
        res.writeHead(200);
        res.end(JSON.stringify(stats, null, 2));
        return;
    }

    if (url === '/api/guilds') {
        const guilds = Array.from(client.guilds.cache.values()).map(guild => ({
            name: guild.name,
            memberCount: guild.memberCount,
            id: guild.id.slice(0, 4) + '****'
        })).sort((a, b) => b.memberCount - a.memberCount);

        res.writeHead(200);
        res.end(JSON.stringify(guilds, null, 2));
        return;
    }

    if (url === '/health') {
        res.writeHead(200);
        res.end(JSON.stringify({ 
            status: client.user ? 'healthy' : 'starting',
            timestamp: new Date().toISOString()
        }));
        return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
    console.log(`🌐 HTTP server on ${PORT}`);
});

process.on('unhandledRejection', error => console.error('❌ Unhandled rejection:', error));
process.on('uncaughtException', error => console.error('❌ Uncaught exception:', error));

// ============================================================================
// BUTTON HANDLERS
// ============================================================================

async function handleGametimeButton(interaction) {
    await interaction.deferReply({ flags: 64 });
    
    const parts = interaction.customId.split('_');
    const response = parts[1];
    const messageId = parts[2];
    
    let message;
    let isFromDM = false;
    
    if (messageId) {
        isFromDM = true;
        
        try {
            const gametime = await db.getGametimeByMessageId(messageId);
            
            if (!gametime) {
                return interaction.editReply({ 
                    content: '❌ Could not find the original gametime poll. It may have been deleted.' 
                });
            }

            const channelId = gametime.channelId || gametime.channel_id;
            
            if (!channelId) {
                console.error('Gametime missing channel ID:', gametime);
                return interaction.editReply({ 
                    content: '❌ Poll data is corrupted. Please create a new gametime poll.' 
                });
            }
            
            const channel = await interaction.client.channels.fetch(channelId);
            
            if (!channel) {
                return interaction.editReply({ 
                    content: '❌ Could not find the poll channel. It may have been deleted.' 
                });
            }
            
            message = await channel.messages.fetch(messageId);
            
        } catch (error) {
            console.error('Error fetching gametime message:', error);
            return interaction.editReply({ 
                content: '❌ Could not update the poll. The message may have been deleted.' 
            });
        }
    } else {
        message = interaction.message;
    }
    
    const embed = message.embeds[0];
    
    if (!embed) {
        await interaction.editReply({ content: '❌ Error: Could not find embed data.' });
        return;
    }

    const canMakeField = embed.fields[0];
    const cantMakeField = embed.fields[1];
    const unsureField = embed.fields[2];

    const extractUserIds = (fieldValue) => {
        if (fieldValue === '• None yet') return [];
        const mentionRegex = /<@(\d+)>/g;
        const ids = [];
        let match;
        while ((match = mentionRegex.exec(fieldValue)) !== null) {
            ids.push(match[1]);
        }
        return ids;
    };

    let canMake = extractUserIds(canMakeField.value);
    let cantMake = extractUserIds(cantMakeField.value);
    let unsure = extractUserIds(unsureField.value);

    const userId = interaction.user.id;

    canMake = canMake.filter(id => id !== userId);
    cantMake = cantMake.filter(id => id !== userId);
    unsure = unsure.filter(id => id !== userId);

    if (response === 'yes') canMake.push(userId);
    else if (response === 'no') cantMake.push(userId);
    else if (response === 'unsure') unsure.push(userId);

    const formatList = (list) => {
        if (list.length === 0) return '• None yet';
        return list.map(id => `• <@${id}>`).join('\n');
    };

    const newEmbed = EmbedBuilder.from(embed).setFields(
        { name: `✅ Can Make (${canMake.length})`, value: formatList(canMake), inline: false },
        { name: `❌ Can't Make (${cantMake.length})`, value: formatList(cantMake), inline: false },
        { name: `❓ Unsure (${unsure.length})`, value: formatList(unsure), inline: false }
    );

    await message.edit({ embeds: [newEmbed] });
    
    const responseText = response === 'yes' ? 'Can Make ✅' : 
                        response === 'no' ? 'Can\'t Make ❌' : 
                        'Unsure ❓';
    
    if (isFromDM) {
        await interaction.editReply({ 
            content: `✅ Your response has been recorded: **${responseText}**\n\nThe poll in the server has been updated!`
        });
    } else {
        await interaction.editReply({ 
            content: `✅ Response recorded: **${responseText}**`
        });
    }
}

async function handleTimesButton(interaction) {
    await interaction.deferReply({ flags: 64 });
    
    const parts = interaction.customId.split('_');
    const timeIndex = parts[1];
    const message = interaction.message;
    const embed = message.embeds[0];
    
    if (!embed) {
        await interaction.editReply({ content: '❌ Error: Could not find embed data.' });
        return;
    }

    const userId = interaction.user.id;
    let description = embed.description;
    const lines = description.split('\n');
    const timeSections = [];
    let currentTime = null;
    let currentUsers = [];
    
    for (const line of lines) {
        if (line.startsWith('🕐 **')) {
            if (currentTime) timeSections.push({ time: currentTime, users: currentUsers });
            currentTime = line.replace('🕐 **', '').replace('**', '');
            currentUsers = [];
        } else if (line.startsWith('• ') && currentTime) {
            const mentionRegex = /<@(\d+)>/g;
            let match;
            const users = [];
            while ((match = mentionRegex.exec(line)) !== null) {
                users.push(match[1]);
            }
            currentUsers = users;
        }
    }
    if (currentTime) timeSections.push({ time: currentTime, users: currentUsers });
    
    const index = parseInt(timeIndex);
    if (timeSections[index]) {
        const userIndex = timeSections[index].users.indexOf(userId);
        if (userIndex > -1) {
            timeSections[index].users.splice(userIndex, 1);
        } else {
            timeSections[index].users.push(userId);
        }
    }
    
    const leagueLine = lines[0];
    let newDescription = leagueLine + '\n\n';
    timeSections.forEach(section => {
        newDescription += `🕐 **${section.time}**\n`;
        if (section.users.length > 0) {
            newDescription += `• ${section.users.map(id => `<@${id}>`).join(' • ')}\n\n`;
        } else {
            newDescription += `• None yet\n\n`;
        }
    });
    
    const newEmbed = EmbedBuilder.from(embed).setDescription(newDescription.trim());
    await message.edit({ embeds: [newEmbed] });
    
    const userSelections = timeSections
        .map((section) => section.users.includes(userId) ? section.time : null)
        .filter(Boolean);
    
    const responseMessage = userSelections.length > 0
        ? `✅ Your selected times:\n${userSelections.map(t => `• ${t}`).join('\n')}`
        : `ℹ️ You haven't selected any times yet.`;
    
    await interaction.editReply({ content: responseMessage });
}

async function handleContractButton(interaction) {
    await interaction.deferReply({ flags: 64 });
    
    const parts = interaction.customId.split('_');
    const action = parts[1];
    const userId = parts[2];
    
    const { hasCoachPerms } = require('./utils/permissions');
    
    if (!await hasCoachPerms(interaction)) {
        return interaction.editReply({
            content: '❌ Only coaches can manage contracts!'
        });
    }

    try {
        const contract = await db.getContractByMessageId(interaction.message.id);
        
        if (!contract) {
            return interaction.editReply({
                content: '❌ Contract not found in database!'
            });
        }

        const user = await interaction.client.users.fetch(userId).catch(() => null);
        if (!user) {
            return interaction.editReply({
                content: '❌ User not found!'
            });
        }

        if (action === 'paid') {
            const newPaidStatus = !contract.paid;
            await db.markContractPaid(interaction.guildId, userId, newPaidStatus);

            const oldEmbed = interaction.message.embeds[0];
            const newEmbed = EmbedBuilder.from(oldEmbed);
            
            const fields = newEmbed.data.fields;
            const paidFieldIndex = fields.findIndex(f => f.name === '💳 Paid');
            
            if (paidFieldIndex !== -1) {
                fields[paidFieldIndex].value = newPaidStatus ? '✅ **YES**' : '❌ **NO**';
            }
            
            newEmbed.setColor(newPaidStatus ? '#00FF00' : '#FFD700');

            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`contract_paid_${userId}`)
                        .setLabel(newPaidStatus ? 'Mark as Unpaid' : 'Mark as Paid')
                        .setStyle(newPaidStatus ? ButtonStyle.Secondary : ButtonStyle.Success)
                        .setEmoji('💰'),
                    new ButtonBuilder()
                        .setCustomId(`contract_delete_${userId}`)
                        .setLabel('Delete Contract')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🗑️')
                );

            await interaction.message.edit({
                embeds: [newEmbed],
                components: [buttons]
            });

            await interaction.editReply({
                content: `✅ Contract marked as **${newPaidStatus ? 'PAID' : 'UNPAID'}** for ${user}!`
            });

        } else if (action === 'delete') {
            await db.removeContract(interaction.guildId, userId);
            await interaction.message.delete();

            await interaction.editReply({
                content: `🗑️ Contract for ${user} has been deleted!`
            });
        }

    } catch (error) {
        console.error('Error handling contract button:', error);
        await interaction.editReply({
            content: '❌ An error occurred while processing the contract!'
        });
    }
}

async function handleLeagueSignupButton(interaction) {
    await interaction.deferReply({ flags: 64 });
    
    const roleId = interaction.customId.split('_')[2];
    
    try {
        const role = interaction.guild.roles.cache.get(roleId);
        
        if (!role) {
            return interaction.editReply({
                content: '❌ League role not found! It may have been deleted.'
            });
        }

        const member = interaction.member;

        if (member.roles.cache.has(roleId)) {
            await member.roles.remove(role);
            
            await interaction.editReply({
                content: `✅ You have been removed from **${role.name}**!`
            });
        } else {
            await member.roles.add(role);
            
            const league = await db.getLeagueByRoleId(interaction.guildId, roleId);
            
            try {
                const welcomeEmbed = new EmbedBuilder()
                    .setTitle('🎉 Welcome to the League!')
                    .setDescription(`You've joined **${league ? league.league_name : role.name}**!`)
                    .addFields(
                        { name: '🏆 League', value: league ? league.league_name : role.name, inline: true },
                        { name: '🏠 Server', value: interaction.guild.name, inline: true }
                    )
                    .setColor('#00FF00')
                    .setFooter({ text: 'Good luck and have fun!' })
                    .setTimestamp();

                if (league && league.signup_link) {
                    welcomeEmbed.addFields(
                        { name: '🔗 League Link', value: `[Click here to view league](${league.signup_link})`, inline: false }
                    );
                }

                await interaction.user.send({ embeds: [welcomeEmbed] });
            } catch (error) {
                console.log('Could not DM user about league signup');
            }

            await interaction.editReply({
                content: `✅ You've been added to **${role.name}**!\n\nCheck your DMs for more information.`
            });
        }

        const channels = await db.getGuildChannels(interaction.guildId);
        if (channels.league_log) {
            const logChannel = interaction.guild.channels.cache.get(channels.league_log);
            if (logChannel) {
                const action = member.roles.cache.has(roleId) ? 'left' : 'joined';
                const color = action === 'left' ? '#FF0000' : '#00FF00';
                
                const logEmbed = new EmbedBuilder()
                    .setDescription(`${interaction.user} ${action} ${role}`)
                    .setColor(color)
                    .setTimestamp();

                await logChannel.send({ embeds: [logEmbed] });
            }
        }

    } catch (error) {
        console.error('Error handling league signup:', error);
        await interaction.editReply({
            content: '❌ An error occurred while updating your league membership!'
        });
    }
}

// Login
console.log('🔐 Attempting to login to Discord...');
console.log('🔍 Token exists:', !!process.env.DISCORD_TOKEN);
console.log('🔍 Token length:', process.env.DISCORD_TOKEN?.length || 0);

if (!process.env.DISCORD_TOKEN) {
    console.error('❌ DISCORD_TOKEN is not set in environment variables!');
    process.exit(1);
}

const loginTimeout = setTimeout(() => {
    if (!client.user) {
        console.error('❌ Bot failed to connect within 60 seconds');
        console.error('🔧 Please check:');
        console.error('   - Discord Developer Portal > Bot > Privileged Gateway Intents');
        console.error('   - Enable: Presence Intent, Server Members Intent, Message Content Intent');
    }
}, 60000);

client.login(process.env.DISCORD_TOKEN)
    .then(() => {
        console.log('✅ Login promise resolved, waiting for ready event...');
        clearTimeout(loginTimeout);
    })
    .catch(error => {
        clearTimeout(loginTimeout);
        console.error('❌ Failed to login to Discord:', error);
        console.error('❌ Check your DISCORD_TOKEN in environment variables');
        process.exit(1);
    });