// index.js - Main bot entry point
require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Events, ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const db = require('./database');

let databaseReady = false;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
    ]
});

// ==============================
// LOAD COMMANDS
// ==============================
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if (command.data && command.execute) {
        client.commands.set(command.data.name, command);
        console.log(`✅ Loaded command: ${command.data.name}`);
    }
}

// ==============================
// READY EVENT
// ==============================
client.once(Events.ClientReady, async () => {
    try {
        await db.initialize();
        databaseReady = true;

        console.log(`\n🤖 ${client.user.tag} is online!`);
        console.log(`📊 Serving ${client.guilds.cache.size} servers`);
        console.log(`👥 Watching ${client.users.cache.size} users\n`);

        client.user.setActivity('your team | /help', {
            type: ActivityType.Watching
        });
    } catch (err) {
        console.error('❌ Failed to initialize database:', err);
        process.exit(1);
    }
});

// ==============================
// INTERACTION HANDLER
// ==============================
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (!databaseReady) {
        return interaction.reply({
            content: '⏳ Bot is still starting up, please try again in a moment.',
            flags: 64
        });
    }

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await db.logCommand(
            interaction.commandName,
            interaction.guildId,
            interaction.user.id
        );

        await command.execute(interaction);
    } catch (error) {
        console.error(`Error executing ${interaction.commandName}:`, error);

        const errorMessage = {
            content: '❌ There was an error executing this command.',
            flags: 64
        };

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
});

// ==============================
// GUILD EVENTS
// ==============================
client.on(Events.GuildCreate, async guild => {
    console.log(`✅ Joined guild: ${guild.name} (${guild.id})`);
    if (databaseReady) {
        await db.createGuild(guild.id, guild.name);
    }
});

client.on(Events.GuildDelete, guild => {
    console.log(`❌ Left guild: ${guild.name} (${guild.id})`);
});

// ==============================
// PROCESS SAFETY
// ==============================
process.on('unhandledRejection', err => {
    console.error('Unhandled rejection:', err);
});

process.on('uncaughtException', err => {
    console.error('Uncaught exception:', err);
    process.exit(1);
});

// ==============================
// LOGIN
// ==============================
client.login(process.env.DISCORD_TOKEN);
