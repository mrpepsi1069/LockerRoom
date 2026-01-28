// index.js - Main bot entry point
require(‘dotenv’).config();
const { Client, GatewayIntentBits, Collection, Events, ActivityType } = require(‘discord.js’);
const fs = require(‘fs’);
const path = require(‘path’);
const db = require(’./database’);

const client = new Client({
intents: [
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.GuildVoiceStates,
GatewayIntentBits.GuildMembers,
GatewayIntentBits.MessageContent,
]
});

// Command collection
client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, ‘commands’);
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(’.js’));

for (const file of commandFiles) {
const filePath = path.join(commandsPath, file);
const command = require(filePath);

```
if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    console.log(`✅ Loaded command: ${command.data.name}`);
} else {
    console.log(`⚠️ Warning: ${file} is missing required "data" or "execute" property.`);
}
```

}

// Bot ready event
client.once(Events.ClientReady, async () => {
console.log(`\n🤖 ${client.user.tag} is online!`);
console.log(`📊 Serving ${client.guilds.cache.size} servers`);
console.log(`👥 Watching ${client.users.cache.size} users\n`);

```
// Set bot status
client.user.setActivity('your team | /help', { type: ActivityType.Watching });

// Initialize database connection
await db.initialize();
```

});

// Interaction handler
client.on(Events.InteractionCreate, async interaction => {
// Handle autocomplete
if (interaction.isAutocomplete()) {
const command = client.commands.get(interaction.commandName);
if (!command || !command.autocomplete) return;

```
    try {
        await command.autocomplete(interaction);
    } catch (error) {
        console.error(`Autocomplete error for ${interaction.commandName}:`, error);
    }
    return;
}

// Handle button interactions
if (interaction.isButton()) {
    if (interaction.customId.startsWith('gametime_')) {
        await handleGametimeButton(interaction);
    }
    return;
}

if (!interaction.isChatInputCommand()) return;

console.log(`\n📨 Command received: /${interaction.commandName} from ${interaction.user.tag}`);

const command = client.commands.get(interaction.commandName);

if (!command) {
    console.error(`❌ Command ${interaction.commandName} not found.`);
    return;
}

try {
    // Log command usage (only if DB is connected)
    if (db) {
        await db.logCommand(interaction.commandName, interaction.guildId, interaction.user.id);
    }
    
    console.log(`⚙️ Executing command: ${interaction.commandName}`);
    
    // Execute command
    await command.execute(interaction);
    
    console.log(`✅ Command completed: ${interaction.commandName}`);
} catch (error) {
    console.error(`❌ Error executing ${interaction.commandName}:`, error);
    
    const errorMessage = {
        content: '❌ There was an error executing this command!',
        ephemeral: true
    };
    
    if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
    } else {
        await interaction.reply(errorMessage);
    }
}
```

});

// Guild join event
client.on(Events.GuildCreate, async guild => {
console.log(`✅ Joined new guild: ${guild.name} (${guild.id})`);

```
// Create guild entry in database
await db.createGuild(guild.id, guild.name);
```

});

// Guild leave event
client.on(Events.GuildDelete, async guild => {
console.log(`❌ Left guild: ${guild.name} (${guild.id})`);
});

// Error handling
process.on(‘unhandledRejection’, error => {
console.error(‘Unhandled promise rejection:’, error);
});

process.on(‘uncaughtException’, error => {
console.error(‘Uncaught exception:’, error);
process.exit(1);
});

// Create a simple HTTP server for Render (free tier requirement)
const http = require(‘http’);
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
if (req.url === ‘/’) {
res.writeHead(200, { ‘Content-Type’: ‘application/json’ });
res.end(JSON.stringify({
status: ‘online’,
bot: client.user?.tag || ‘Starting…’,
guilds: client.guilds.cache.size,
uptime: process.uptime()
}));
} else {
res.writeHead(404);
res.end(‘Not Found’);
}
});

server.listen(PORT, () => {
console.log(`🌐 HTTP server listening on port ${PORT}`);
});

// Login
client.login(process.env.DISCORD_TOKEN);