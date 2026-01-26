// test-login.js
const { Client } = require('discord.js');
const config = require('./config.json');

const client = new Client({ intents: [] });

client.once('ready', () => {
  console.log('Logged in as', client.user.tag);
  process.exit(0);
});

client.login(config.token);
