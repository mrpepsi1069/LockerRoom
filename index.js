// index.js
require('dotenv').config();

const { 
    Client,
    GatewayIntentBits,
    Collection,
    Events,
    ActivityType
} = require('discord.js');

const fs = require('fs');
const path = require('path');
const http = require('http');
const database = require('./database');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent
    ]
});

client.commands = new Collection();

/* ===================== LOAD COMMANDS ===================== */

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if (command.data && command.execute) {
        client.commands.set(command.data.name, command);
        console.log(`✅ Loaded command: ${command.data.name}`);
    }
}

/* ===================== READY ===================== */

client.once(Events.ClientReady, async () => {
    console.log(`🤖 ${client.user.tag} is online`);
    console.log(`📊 Servers: ${client.guilds.cache.size}`);

    client.user.setActivity('/help | LockerRoom', {
        type: ActivityType.Watching
    });

    try {
        await database.initialize();
    } catch {
        console.warn('⚠️ DB failed during startup');
    }
});

/* ===================== INTERACTIONS ===================== */

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await database.logCommand(
            interaction.commandName,
            interaction.guildId,
            interaction.user.id
        );

        await command.execute(interaction);
    } catch (err) {
        console.error(`❌ Command error:`, err);

        const msg = { 
            content: '❌ Command failed.', 
            ephemeral: true 
        };

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(msg);
        } else {
            await interaction.reply(msg);
        }
    }
});

/* ===================== GUILD EVENTS ===================== */

client.on(Events.GuildCreate, async guild => {
    console.log(`➕ Joined: ${guild.name}`);
    await database.createGuild(guild.id, guild.name);
});

/* ===================== ERROR HANDLING ===================== */

process.on('unhandledRejection', err => {
    console.error('Unhandled rejection:', err);
});

process.on('uncaughtException', err => {
    console.error('Uncaught exception:', err);
});

/* ===================== HTTP SERVER (RENDER) ===================== */

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        status: 'online',
        bot: client.user?.tag ?? 'starting',
        uptime: process.uptime()
    }));
}).listen(PORT, () => {
    console.log(`🌐 HTTP server on ${PORT}`);
});

/* ===================== LOGIN ===================== */

client.login(process.env.DISCORD_TOKEN);
