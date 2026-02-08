// index.js
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
        }
        return;
    }

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        if (db) {
            await db.logCommand(interaction.commandName, interaction.guildId, interaction.user.id);
        }
        await command.execute(interaction);
    } catch (error) {
        console.error(`❌ Command error:`, error);
        const errorMessage = { content: '❌ Error executing command!', ephemeral: true };
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

// Error handling for client
client.on('error', error => {
    console.error('❌ Discord client error:', error);
});

const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const url = req.url;

    // Root endpoint - Basic stats
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

    // Guild list endpoint (public - shows basic info)
    if (url === '/api/guilds') {
        const guilds = Array.from(client.guilds.cache.values()).map(guild => ({
            name: guild.name,
            memberCount: guild.memberCount,
            id: guild.id.slice(0, 4) + '****' // Partial ID for privacy
        })).sort((a, b) => b.memberCount - a.memberCount); // Sort by size

        res.writeHead(200);
        res.end(JSON.stringify(guilds, null, 2));
        return;
    }

    // Health check endpoint
    if (url === '/health') {
        res.writeHead(200);
        res.end(JSON.stringify({ 
            status: client.user ? 'healthy' : 'starting',
            timestamp: new Date().toISOString()
        }));
        return;
    }

    // 404 for other routes
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
    console.log(`🌐 HTTP server on ${PORT}`);
});

process.on('unhandledRejection', error => console.error('❌ Unhandled rejection:', error));
process.on('uncaughtException', error => console.error('❌ Uncaught exception:', error));

async function handleGametimeButton(interaction) {
    // Defer immediately to prevent timeout
    await interaction.deferReply({ ephemeral: true });
    
    const parts = interaction.customId.split('_');
    const response = parts[1]; // 'yes', 'no', or 'unsure'
    const messageId = parts[2]; // Message ID if clicked from DM
    
    let message;
    let isFromDM = false;
    
    // Check if this is from a DM (has messageId) or from channel
    if (messageId) {
        // Button clicked from DM - need to fetch the original channel message
        isFromDM = true;
        
        try {
            // Get gametime from database to find the channel
            const gametime = await db.getGametimeByMessageId(messageId);
            
            if (!gametime) {
                return interaction.editReply({ 
                    content: '❌ Could not find the original gametime poll. It may have been deleted.' 
                });
            }
            
            // Fetch the channel and message
            const channel = await interaction.client.channels.fetch(gametime.channelId);
            message = await channel.messages.fetch(messageId);
            
        } catch (error) {
            console.error('Error fetching gametime message:', error);
            return interaction.editReply({ 
                content: '❌ Could not update the poll. The message may have been deleted.' 
            });
        }
    } else {
        // Button clicked from channel message
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

    // Extract user IDs from mentions
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

    // Remove user from all lists
    canMake = canMake.filter(id => id !== userId);
    cantMake = cantMake.filter(id => id !== userId);
    unsure = unsure.filter(id => id !== userId);

    // Add user to selected list
    if (response === 'yes') canMake.push(userId);
    else if (response === 'no') cantMake.push(userId);
    else if (response === 'unsure') unsure.push(userId);

    // Format lists with mentions only
    const formatList = (list) => {
        if (list.length === 0) return '• None yet';
        return list.map(id => `• <@${id}>`).join('\n');
    };

    const newEmbed = EmbedBuilder.from(embed).setFields(
        { name: `✅ Can Make (${canMake.length})`, value: formatList(canMake), inline: false },
        { name: `❌ Can't Make (${cantMake.length})`, value: formatList(cantMake), inline: false },
        { name: `❓ Unsure (${unsure.length})`, value: formatList(unsure), inline: false }
    );

    // Update the channel message
    await message.edit({ embeds: [newEmbed] });
    
    // Send different responses for DM vs channel
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
    // Defer immediately to prevent timeout
    await interaction.deferReply({ ephemeral: true });
    
    const parts = interaction.customId.split('_');
    const timeIndex = parts[1];
    const selectedTime = parts.slice(2).join('_');
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
            // Extract user IDs from mentions
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
    
    // Toggle user selection for this time
    const index = parseInt(timeIndex);
    if (timeSections[index]) {
        const userIndex = timeSections[index].users.indexOf(userId);
        if (userIndex > -1) {
            // User already selected this time, remove them
            timeSections[index].users.splice(userIndex, 1);
        } else {
            // User hasn't selected this time, add them
            timeSections[index].users.push(userId);
        }
    }
    
    // Rebuild description with user mentions
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
    
    // Show user their current selections
    const userSelections = timeSections
        .map((section, idx) => section.users.includes(userId) ? section.time : null)
        .filter(Boolean);
    
    const responseMessage = userSelections.length > 0
        ? `✅ Your selected times:\n${userSelections.map(t => `• ${t}`).join('\n')}`
        : `ℹ️ You haven't selected any times yet.`;
    
    await interaction.editReply({ content: responseMessage });
}

async function handleContractButton(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const parts = interaction.customId.split('_');
    const action = parts[1]; // 'paid' or 'delete'
    const userId = parts[2];
    
    const { hasCoachPerms } = require('./utils/permissions');
    
    // Check permissions
    if (!await hasCoachPerms(interaction)) {
        return interaction.editReply({
            content: '❌ Only coaches can manage contracts!',
            ephemeral: true
        });
    }

    try {
        // Get contract from database
        const contract = await db.getContractByMessageId(interaction.message.id);
        
        if (!contract) {
            return interaction.editReply({
                content: '❌ Contract not found in database!',
                ephemeral: true
            });
        }

        const user = await interaction.client.users.fetch(userId).catch(() => null);
        if (!user) {
            return interaction.editReply({
                content: '❌ User not found!',
                ephemeral: true
            });
        }

        if (action === 'paid') {
            // Mark as paid/unpaid (toggle)
            const newPaidStatus = !contract.paid;
            await db.markContractPaid(interaction.guildId, userId, newPaidStatus);

            // Update embed
            const oldEmbed = interaction.message.embeds[0];
            const newEmbed = EmbedBuilder.from(oldEmbed);
            
            // Update the "Paid" field
            const fields = newEmbed.data.fields;
            const paidFieldIndex = fields.findIndex(f => f.name === '💳 Paid');
            
            if (paidFieldIndex !== -1) {
                fields[paidFieldIndex].value = newPaidStatus ? '✅ **YES**' : '❌ **NO**';
            }
            
            // Change embed color based on paid status
            newEmbed.setColor(newPaidStatus ? '#00FF00' : '#FFD700');

            // Update button label
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
                content: `✅ Contract marked as **${newPaidStatus ? 'PAID' : 'UNPAID'}** for ${user}!`,
                ephemeral: true
            });

        } else if (action === 'delete') {
            // Delete contract
            await db.removeContract(interaction.guildId, userId);
            await interaction.message.delete();

            await interaction.editReply({
                content: `🗑️ Contract for ${user} has been deleted!`,
                ephemeral: true
            });
        }

    } catch (error) {
        console.error('Error handling contract button:', error);
        await interaction.editReply({
            content: '❌ An error occurred while processing the contract!',
            ephemeral: true
        });
    }
}

// Login to Discord - with error handling
console.log('🔐 Attempting to login to Discord...');
console.log('🔍 Token exists:', !!process.env.DISCORD_TOKEN);
console.log('🔍 Token length:', process.env.DISCORD_TOKEN?.length || 0);

if (!process.env.DISCORD_TOKEN) {
    console.error('❌ DISCORD_TOKEN is not set in environment variables!');
    console.error('❌ Please add DISCORD_TOKEN to your Render environment variables');
    process.exit(1);
}

// Add ready event listener with timeout
const loginTimeout = setTimeout(() => {
    if (!client.user) {
        console.error('❌ Bot failed to connect within 60 seconds');
        console.error('❌ Possible causes:');
        console.error('   1. Invalid Discord token');
        console.error('   2. Missing privileged gateway intents in Discord Developer Portal');
        console.error('   3. Network connectivity issues');
        console.error('   4. Discord API is down');
        console.error('');
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
        console.error('❌ Error name:', error.name);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error code:', error.code);
        console.error('❌ Check your DISCORD_TOKEN in environment variables');
        process.exit(1);
    });