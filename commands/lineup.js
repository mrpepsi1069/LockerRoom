// commands/lineup.js
const { SlashCommandBuilder } = require('discord.js');
const db = require('../database');
const { successEmbed, errorEmbed, lineupEmbed } = require('../utils/embeds');
const { hasManagerPerms } = require('../utils/permissions');
const { sanitizeInput } = require('../utils/validation');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lineup')
        .setDescription('Manage team lineups')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new lineup')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Lineup name')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Lineup description')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a player to a lineup')
                .addStringOption(option =>
                    option.setName('lineup')
                        .setDescription('Lineup name')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addUserOption(option =>
                    option.setName('player')
                        .setDescription('Player to add')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('position')
                        .setDescription('Player position (QB, OL, TE, etc.)')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a player from a lineup')
                .addStringOption(option =>
                    option.setName('lineup')
                        .setDescription('Lineup name')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addUserOption(option =>
                    option.setName('player')
                        .setDescription('Player to remove')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Edit a player position in a lineup')
                .addStringOption(option =>
                    option.setName('lineup')
                        .setDescription('Lineup name')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addUserOption(option =>
                    option.setName('player')
                        .setDescription('Player to edit')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('position')
                        .setDescription('New position')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View a specific lineup')
                .addStringOption(option =>
                    option.setName('lineup')
                        .setDescription('Lineup name')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('View all lineups'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete a lineup')
                .addStringOption(option =>
                    option.setName('lineup')
                        .setDescription('Lineup name')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('post')
                .setDescription('Post a lineup to a channel')
                .addStringOption(option =>
                    option.setName('lineup')
                        .setDescription('Lineup name')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to post to (defaults to current)')
                        .setRequired(false))),
    
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        const lineups = await db.getLineups(interaction.guildId);
        
        if (!lineups || lineups.length === 0) {
            return interaction.respond([]);
        }
        
        const filtered = lineups
            .filter(lineup => lineup.lineup_name.toLowerCase().includes(focusedValue.toLowerCase()))
            .slice(0, 25) // Discord limit
            .map(lineup => ({
                name: lineup.lineup_name,
                value: lineup.lineup_name
            }));
        
        await interaction.respond(filtered);
    },
    
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        // Check permissions for manager commands
        if (['create', 'add', 'remove', 'edit', 'delete', 'post'].includes(subcommand)) {
            if (!await hasManagerPerms(interaction)) {
                return interaction.reply({ 
                    embeds: [errorEmbed('Permission Denied', 'You need Manager role or higher to use this command.')], 
                    ephemeral: true 
                });
            }
        }

        switch (subcommand) {
            case 'create':
                await handleCreate(interaction);
                break;
            case 'add':
                await handleAdd(interaction);
                break;
            case 'remove':
                await handleRemove(interaction);
                break;
            case 'edit':
                await handleEdit(interaction);
                break;
            case 'view':
                await handleView(interaction);
                break;
            case 'list':
                await handleList(interaction);
                break;
            case 'delete':
                await handleDelete(interaction);
                break;
            case 'post':
                await handlePost(interaction);
                break;
        }
    }
};

async function handleCreate(interaction) {
    const name = sanitizeInput(interaction.options.getString('name'), 50);
    const description = sanitizeInput(interaction.options.getString('description'), 200);

    try {
        const lineup = await db.createLineup(
            interaction.guildId,
            name,
            description,
            interaction.user.id
        );

        await interaction.reply({
            embeds: [successEmbed('Lineup Created', `Successfully created lineup **${name}**\nUse \`/lineup add\` to add players.`)]
        });
    } catch (error) {
        if (error.message === 'DUPLICATE_LINEUP') {
            await interaction.reply({
                embeds: [errorEmbed('Lineup Exists', `A lineup named **${name}** already exists.`)],
                ephemeral: true
            });
        } else {
            throw error;
        }
    }
}

async function handleAdd(interaction) {
    const lineupName = sanitizeInput(interaction.options.getString('lineup'));
    const player = interaction.options.getUser('player');
    const position = sanitizeInput(interaction.options.getString('position'), 50).toUpperCase();

    const lineup = await db.getLineup(interaction.guildId, lineupName);
    
    if (!lineup) {
        return interaction.reply({
            embeds: [errorEmbed('Lineup Not Found', `Lineup **${lineupName}** does not exist.`)],
            ephemeral: true
        });
    }

    // Ensure user exists in database
    await db.createOrUpdateUser(player.id, player.username);

    await db.addPlayerToLineup(lineup._id, player.id, position);

    await interaction.reply({
        embeds: [successEmbed('Player Added', `Added <@${player.id}> to **${lineupName}** as **${position}**`)]
    });
}

async function handleRemove(interaction) {
    const lineupName = sanitizeInput(interaction.options.getString('lineup'));
    const player = interaction.options.getUser('player');

    const lineup = await db.getLineup(interaction.guildId, lineupName);
    
    if (!lineup) {
        return interaction.reply({
            embeds: [errorEmbed('Lineup Not Found', `Lineup **${lineupName}** does not exist.`)],
            ephemeral: true
        });
    }

    await db.removePlayerFromLineup(lineup._id, player.id);

    await interaction.reply({
        embeds: [successEmbed('Player Removed', `Removed <@${player.id}> from **${lineupName}**`)]
    });
}

async function handleEdit(interaction) {
    const lineupName = sanitizeInput(interaction.options.getString('lineup'));
    const player = interaction.options.getUser('player');
    const newPosition = sanitizeInput(interaction.options.getString('position'), 50).toUpperCase();

    const lineup = await db.getLineup(interaction.guildId, lineupName);
    
    if (!lineup) {
        return interaction.reply({
            embeds: [errorEmbed('Lineup Not Found', `Lineup **${lineupName}** does not exist.`)],
            ephemeral: true
        });
    }

    await db.addPlayerToLineup(lineup._id, player.id, newPosition);

    await interaction.reply({
        embeds: [successEmbed('Position Updated', `Updated <@${player.id}>'s position to **${newPosition}** in **${lineupName}**`)]
    });
}

async function handleView(interaction) {
    const lineupName = sanitizeInput(interaction.options.getString('lineup'));
    const lineup = await db.getLineup(interaction.guildId, lineupName);
    
    if (!lineup) {
        return interaction.reply({
            embeds: [errorEmbed('Lineup Not Found', `Lineup **${lineupName}** does not exist.`)],
            ephemeral: true
        });
    }

    const embed = lineupEmbed(lineup);
    await interaction.reply({ embeds: [embed] });
}

async function handleList(interaction) {
    const lineups = await db.getLineups(interaction.guildId);
    
    if (lineups.length === 0) {
        return interaction.reply({
            embeds: [errorEmbed('No Lineups', 'No lineups have been created yet.\nUse `/lineup create` to make one.')],
            ephemeral: true
        });
    }

    const lineupList = lineups.map(l => `• **${l.lineup_name}**${l.description ? ` - ${l.description}` : ''}`).join('\n');
    
    await interaction.reply({
        embeds: [successEmbed('Server Lineups', lineupList)]
    });
}

async function handleDelete(interaction) {
    const lineupName = sanitizeInput(interaction.options.getString('lineup'));
    
    const lineup = await db.getLineup(interaction.guildId, lineupName);
    
    if (!lineup) {
        return interaction.reply({
            embeds: [errorEmbed('Lineup Not Found', `Lineup **${lineupName}** does not exist.`)],
            ephemeral: true
        });
    }

    await db.deleteLineup(interaction.guildId, lineupName);

    await interaction.reply({
        embeds: [successEmbed('Lineup Deleted', `Successfully deleted lineup **${lineupName}**`)]
    });
}

async function handlePost(interaction) {
    const lineupName = sanitizeInput(interaction.options.getString('lineup'));
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    
    const lineup = await db.getLineup(interaction.guildId, lineupName);
    
    if (!lineup) {
        return interaction.reply({
            embeds: [errorEmbed('Lineup Not Found', `Lineup **${lineupName}** does not exist.`)],
            ephemeral: true
        });
    }

    const embed = lineupEmbed(lineup);
    await channel.send({ embeds: [embed] });

    await interaction.reply({
        embeds: [successEmbed('Lineup Posted', `Posted **${lineupName}** to ${channel}`)],
        ephemeral: true
    });
}