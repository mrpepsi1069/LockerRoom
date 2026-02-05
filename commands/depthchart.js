// commands/depthchart.js - All depth chart commands in one file
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { hasManagerPerms } = require('../utils/permissions');
const { successEmbed, errorEmbed } = require('../utils/embeds');
const db = require('../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('depthchart')
        .setDescription('Manage team depth charts (Premium)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new depth chart')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Depth chart name (e.g., "Quarterbacks")')
                        .setRequired(true)
                        .setMaxLength(50))
                .addStringOption(option =>
                    option.setName('abbreviation')
                        .setDescription('Short name (e.g., "QB")')
                        .setRequired(true)
                        .setMaxLength(10)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a player to depth chart')
                .addStringOption(option =>
                    option.setName('depthchart')
                        .setDescription('Select depth chart')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Player to add')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a player from depth chart')
                .addStringOption(option =>
                    option.setName('depthchart')
                        .setDescription('Select depth chart')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Player to remove')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('promote')
                .setDescription('Promote a player up the depth chart')
                .addStringOption(option =>
                    option.setName('depthchart')
                        .setDescription('Select depth chart')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Player to promote')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('demote')
                .setDescription('Demote a player down the depth chart')
                .addStringOption(option =>
                    option.setName('depthchart')
                        .setDescription('Select depth chart')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Player to demote')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('post')
                .setDescription('Display a depth chart')
                .addStringOption(option =>
                    option.setName('depthchart')
                        .setDescription('Select depth chart to post')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete an entire depth chart')
                .addStringOption(option =>
                    option.setName('depthchart')
                        .setDescription('Select depth chart to delete')
                        .setRequired(true)
                        .setAutocomplete(true))),

    async autocomplete(interaction) {
        try {
            const depthCharts = await db.getAllDepthCharts(interaction.guildId);
            
            const choices = depthCharts.map(dc => ({
                name: `${dc.abbreviation} - ${dc.name}`,
                value: dc.abbreviation
            }));

            await interaction.respond(choices.slice(0, 25));
        } catch (error) {
            console.error('Autocomplete error:', error);
            await interaction.respond([]);
        }
    },

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        // Route to appropriate handler
        switch (subcommand) {
            case 'create':
                return await handleCreate(interaction);
            case 'add':
                return await handleAdd(interaction);
            case 'remove':
                return await handleRemove(interaction);
            case 'promote':
                return await handlePromote(interaction);
            case 'demote':
                return await handleDemote(interaction);
            case 'post':
                return await handlePost(interaction);
            case 'delete':
                return await handleDelete(interaction);
        }
    }
};

// ============================================================================
// SUBCOMMAND HANDLERS
// ============================================================================

async function handleCreate(interaction) {
    if (!await hasManagerPerms(interaction)) {
        return interaction.reply({
            embeds: [errorEmbed('Permission Denied', 'You need Manager role or higher!')],
            ephemeral: true
        });
    }

    const name = interaction.options.getString('name');
    const abbreviation = interaction.options.getString('abbreviation').toUpperCase();

    await interaction.deferReply({ ephemeral: true });

    try {
        const existing = await db.getDepthChart(interaction.guildId, abbreviation);
        if (existing) {
            return interaction.editReply({
                embeds: [errorEmbed('Already Exists', `Depth chart **${abbreviation}** already exists!\n\nUse \`/depthchart delete\` to remove it first.`)]
            });
        }

        await db.createDepthChart(interaction.guildId, name, abbreviation);

        await interaction.editReply({
            embeds: [successEmbed(
                '📊 Depth Chart Created',
                `Created **${name}** (${abbreviation})\n\nUse \`/depthchart add\` to add players!`
            )]
        });

    } catch (error) {
        console.error('Error creating depth chart:', error);
        await interaction.editReply({
            embeds: [errorEmbed('Error', 'Failed to create depth chart. Please try again.')]
        });
    }
}

async function handleAdd(interaction) {
    if (!await hasManagerPerms(interaction)) {
        return interaction.reply({
            embeds: [errorEmbed('Permission Denied', 'You need Manager role or higher!')],
            ephemeral: true
        });
    }

    const abbreviation = interaction.options.getString('depthchart');
    const user = interaction.options.getUser('user');

    await interaction.deferReply({ ephemeral: true });

    try {
        const depthChart = await db.getDepthChart(interaction.guildId, abbreviation);
        if (!depthChart) {
            return interaction.editReply({
                embeds: [errorEmbed('Not Found', `Depth chart **${abbreviation}** doesn't exist!`)]
            });
        }

        if (depthChart.players && depthChart.players.some(p => p.userId === user.id)) {
            return interaction.editReply({
                embeds: [errorEmbed('Already Added', `${user} is already in **${abbreviation}** depth chart!`)]
            });
        }

        await db.addPlayerToDepthChart(interaction.guildId, abbreviation, user.id);

        const position = (depthChart.players?.length || 0) + 1;

        await interaction.editReply({
            embeds: [successEmbed(
                '✅ Player Added',
                `Added ${user} to **${depthChart.name}**\n**Position:** ${abbreviation}${position}\n\nUse \`/depthchart post\` to view!`
            )]
        });

    } catch (error) {
        console.error('Error adding to depth chart:', error);
        await interaction.editReply({
            embeds: [errorEmbed('Error', 'Failed to add player. Please try again.')]
        });
    }
}

async function handleRemove(interaction) {
    if (!await hasManagerPerms(interaction)) {
        return interaction.reply({
            embeds: [errorEmbed('Permission Denied', 'You need Manager role or higher!')],
            ephemeral: true
        });
    }

    const abbreviation = interaction.options.getString('depthchart');
    const user = interaction.options.getUser('user');

    await interaction.deferReply({ ephemeral: true });

    try {
        const depthChart = await db.getDepthChart(interaction.guildId, abbreviation);
        if (!depthChart) {
            return interaction.editReply({
                embeds: [errorEmbed('Not Found', `Depth chart **${abbreviation}** doesn't exist!`)]
            });
        }

        if (!depthChart.players || !depthChart.players.some(p => p.userId === user.id)) {
            return interaction.editReply({
                embeds: [errorEmbed('Not Found', `${user} is not in **${abbreviation}** depth chart!`)]
            });
        }

        await db.removePlayerFromDepthChart(interaction.guildId, abbreviation, user.id);

        await interaction.editReply({
            embeds: [successEmbed(
                '🗑️ Player Removed',
                `Removed ${user} from **${depthChart.name}**`
            )]
        });

    } catch (error) {
        console.error('Error removing from depth chart:', error);
        await interaction.editReply({
            embeds: [errorEmbed('Error', 'Failed to remove player. Please try again.')]
        });
    }
}

async function handlePromote(interaction) {
    if (!await hasManagerPerms(interaction)) {
        return interaction.reply({
            embeds: [errorEmbed('Permission Denied', 'You need Manager role or higher!')],
            ephemeral: true
        });
    }

    const abbreviation = interaction.options.getString('depthchart');
    const user = interaction.options.getUser('user');

    await interaction.deferReply({ ephemeral: true });

    try {
        const depthChart = await db.getDepthChart(interaction.guildId, abbreviation);
        if (!depthChart) {
            return interaction.editReply({
                embeds: [errorEmbed('Not Found', `Depth chart **${abbreviation}** doesn't exist!`)]
            });
        }

        if (!depthChart.players || depthChart.players.length === 0) {
            return interaction.editReply({
                embeds: [errorEmbed('Empty', `**${abbreviation}** depth chart is empty!`)]
            });
        }

        const playerIndex = depthChart.players.findIndex(p => p.userId === user.id);
        
        if (playerIndex === -1) {
            return interaction.editReply({
                embeds: [errorEmbed('Not Found', `${user} is not in **${abbreviation}** depth chart!`)]
            });
        }

        if (playerIndex === 0) {
            return interaction.editReply({
                embeds: [errorEmbed('Already at Top', `${user} is already **${abbreviation}1** (top of depth chart)!`)]
            });
        }

        await db.swapDepthChartPlayers(interaction.guildId, abbreviation, playerIndex, playerIndex - 1);

        const newPosition = playerIndex;
        const oldPosition = playerIndex + 1;

        await interaction.editReply({
            embeds: [successEmbed(
                '⬆️ Player Promoted',
                `${user} moved up!\n**${abbreviation}${oldPosition + 1}** → **${abbreviation}${newPosition + 1}**`
            )]
        });

    } catch (error) {
        console.error('Error promoting player:', error);
        await interaction.editReply({
            embeds: [errorEmbed('Error', 'Failed to promote player. Please try again.')]
        });
    }
}

async function handleDemote(interaction) {
    if (!await hasManagerPerms(interaction)) {
        return interaction.reply({
            embeds: [errorEmbed('Permission Denied', 'You need Manager role or higher!')],
            ephemeral: true
        });
    }

    const abbreviation = interaction.options.getString('depthchart');
    const user = interaction.options.getUser('user');

    await interaction.deferReply({ ephemeral: true });

    try {
        const depthChart = await db.getDepthChart(interaction.guildId, abbreviation);
        if (!depthChart) {
            return interaction.editReply({
                embeds: [errorEmbed('Not Found', `Depth chart **${abbreviation}** doesn't exist!`)]
            });
        }

        if (!depthChart.players || depthChart.players.length === 0) {
            return interaction.editReply({
                embeds: [errorEmbed('Empty', `**${abbreviation}** depth chart is empty!`)]
            });
        }

        const playerIndex = depthChart.players.findIndex(p => p.userId === user.id);
        
        if (playerIndex === -1) {
            return interaction.editReply({
                embeds: [errorEmbed('Not Found', `${user} is not in **${abbreviation}** depth chart!`)]
            });
        }

        if (playerIndex === depthChart.players.length - 1) {
            return interaction.editReply({
                embeds: [errorEmbed('Already at Bottom', `${user} is already at the bottom!`)]
            });
        }

        await db.swapDepthChartPlayers(interaction.guildId, abbreviation, playerIndex, playerIndex + 1);

        const newPosition = playerIndex + 2;
        const oldPosition = playerIndex + 1;

        await interaction.editReply({
            embeds: [successEmbed(
                '⬇️ Player Demoted',
                `${user} moved down!\n**${abbreviation}${oldPosition}** → **${abbreviation}${newPosition}**`
            )]
        });

    } catch (error) {
        console.error('Error demoting player:', error);
        await interaction.editReply({
            embeds: [errorEmbed('Error', 'Failed to demote player. Please try again.')]
        });
    }
}

async function handlePost(interaction) {
    const abbreviation = interaction.options.getString('depthchart');

    await interaction.deferReply();

    try {
        const depthChart = await db.getDepthChart(interaction.guildId, abbreviation);
        
        if (!depthChart) {
            return interaction.editReply({
                embeds: [errorEmbed('Not Found', `Depth chart **${abbreviation}** doesn't exist!`)],
                ephemeral: true
            });
        }

        if (!depthChart.players || depthChart.players.length === 0) {
            return interaction.editReply({
                embeds: [errorEmbed('Empty', `**${depthChart.name}** depth chart is empty!\n\nUse \`/depthchart add\` to add players.`)],
                ephemeral: true
            });
        }

        let depthChartText = '';
        
        for (let i = 0; i < depthChart.players.length; i++) {
            const player = depthChart.players[i];
            const user = await interaction.client.users.fetch(player.userId).catch(() => null);
            
            if (user) {
                depthChartText += `**${abbreviation}${i + 1}:** ${user}\n`;
            }
        }

        if (!depthChartText) {
            depthChartText = '• No players found';
        }

        const embed = new EmbedBuilder()
            .setTitle(`${depthChart.name}:`)
            .setDescription(depthChartText)
            .setColor('#5865F2')
            .setFooter({ text: `${interaction.guild.name} • Depth Chart` })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('Error posting depth chart:', error);
        await interaction.editReply({
            embeds: [errorEmbed('Error', 'Failed to post depth chart.')],
            ephemeral: true
        });
    }
}

async function handleDelete(interaction) {
    if (!await hasManagerPerms(interaction)) {
        return interaction.reply({
            embeds: [errorEmbed('Permission Denied', 'You need Manager role or higher!')],
            ephemeral: true
        });
    }

    const abbreviation = interaction.options.getString('depthchart');

    await interaction.deferReply({ ephemeral: true });

    try {
        const depthChart = await db.getDepthChart(interaction.guildId, abbreviation);
        
        if (!depthChart) {
            return interaction.editReply({
                embeds: [errorEmbed('Not Found', `Depth chart **${abbreviation}** doesn't exist!`)]
            });
        }

        await db.deleteDepthChart(interaction.guildId, abbreviation);

        await interaction.editReply({
            embeds: [successEmbed(
                '🗑️ Depth Chart Deleted',
                `Deleted **${depthChart.name}** (${abbreviation}) and all ${depthChart.players?.length || 0} players.`
            )]
        });

    } catch (error) {
        console.error('Error deleting depth chart:', error);
        await interaction.editReply({
            embeds: [errorEmbed('Error', 'Failed to delete depth chart.')]
        });
    }
}