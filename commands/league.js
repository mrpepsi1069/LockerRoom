// commands/league.js - Updated with auto role creation and recruitment embed
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { hasCoachPerms } = require('../utils/permissions');
const { successEmbed, errorEmbed } = require('../utils/embeds');
const db = require('../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('league')
        .setDescription('Manage leagues')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a new league')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('League name (e.g., "National Football Alliance")')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('abbreviation')
                        .setDescription('League abbreviation (e.g., "NFA")')
                        .setRequired(true)
                        .setMaxLength(10))
                .addStringOption(option =>
                    option.setName('signup')
                        .setDescription('Signup link (optional)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete a league')
                .addStringOption(option =>
                    option.setName('abbreviation')
                        .setDescription('League abbreviation to delete')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all leagues'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('recruit')
                .setDescription('Post a recruitment message for a league')
                .addStringOption(option =>
                    option.setName('abbreviation')
                        .setDescription('League abbreviation')
                        .setRequired(true)
                        .setAutocomplete(true))),

    async autocomplete(interaction) {
        try {
            const leagues = await db.getLeagues(interaction.guildId);
            const choices = leagues.map(league => ({
                name: `${league.league_abbr} - ${league.league_name}`,
                value: league.league_abbr
            }));
            await interaction.respond(choices.slice(0, 25));
        } catch (error) {
            console.error('Autocomplete error:', error);
            await interaction.respond([]);
        }
    },

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'add':
                return await handleAdd(interaction);
            case 'delete':
                return await handleDelete(interaction);
            case 'list':
                return await handleList(interaction);
            case 'recruit':
                return await handleRecruit(interaction);
        }
    }
};

async function handleAdd(interaction) {
    if (!await hasCoachPerms(interaction)) {
        return interaction.reply({
            embeds: [errorEmbed('Permission Denied', 'You need Coach role or higher!')],
            ephemeral: true
        });
    }

    const name = interaction.options.getString('name');
    const abbreviation = interaction.options.getString('abbreviation').toUpperCase();
    const signup = interaction.options.getString('signup');

    await interaction.deferReply({ ephemeral: true });

    try {
        // Check if league already exists
        const existing = await db.getLeagueByAbbr(interaction.guildId, abbreviation);
        if (existing) {
            return interaction.editReply({
                embeds: [errorEmbed('Already Exists', `League **${abbreviation}** already exists!`)]
            });
        }

        // Create role for the league
        let role;
        try {
            role = await interaction.guild.roles.create({
                name: abbreviation,
                color: Math.floor(Math.random() * 16777215), // Random color
                reason: `League role for ${name}`,
                mentionable: true
            });
            console.log(`✅ Created role: @${abbreviation}`);
        } catch (error) {
            console.error('Error creating role:', error);
            return interaction.editReply({
                embeds: [errorEmbed('Permission Error', 'Bot does not have permission to create roles!\n\nPlease give the bot the "Manage Roles" permission.')]
            });
        }

        // Add league to database with role ID
        await db.createLeague(interaction.guildId, name, abbreviation, signup, role.id);

        // Get league log channel
        const channels = await db.getGuildChannels(interaction.guildId);
        if (channels.league_log) {
            const logChannel = interaction.guild.channels.cache.get(channels.league_log);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('🏈 New League Added')
                    .setDescription(`**${name}** (${abbreviation})`)
                    .addFields(
                        { name: 'Role', value: `${role}`, inline: true },
                        { name: 'Added By', value: `${interaction.user}`, inline: true }
                    )
                    .setColor('#00FF00')
                    .setTimestamp();

                if (signup) {
                    logEmbed.addFields({ name: 'Signup Link', value: signup, inline: false });
                }

                await logChannel.send({ embeds: [logEmbed] });
            }
        }

        await interaction.editReply({
            embeds: [successEmbed(
                '✅ League Added',
                `**${name}** (${abbreviation})\n\n` +
                `**Role:** ${role}\n` +
                (signup ? `**Signup:** ${signup}\n\n` : '\n') +
                `Use \`/league recruit ${abbreviation}\` to post a recruitment message!`
            )]
        });

    } catch (error) {
        console.error('Error adding league:', error);
        await interaction.editReply({
            embeds: [errorEmbed('Error', 'Failed to add league. Please try again.')]
        });
    }
}

async function handleDelete(interaction) {
    if (!await hasCoachPerms(interaction)) {
        return interaction.reply({
            embeds: [errorEmbed('Permission Denied', 'You need Coach role or higher!')],
            ephemeral: true
        });
    }

    const abbreviation = interaction.options.getString('abbreviation').toUpperCase();

    await interaction.deferReply({ ephemeral: true });

    try {
        const league = await db.getLeagueByAbbr(interaction.guildId, abbreviation);
        
        if (!league) {
            return interaction.editReply({
                embeds: [errorEmbed('Not Found', `League **${abbreviation}** doesn't exist!`)]
            });
        }

        // Delete the role if it exists
        if (league.role_id) {
            try {
                const role = interaction.guild.roles.cache.get(league.role_id);
                if (role) {
                    await role.delete(`League ${abbreviation} deleted`);
                    console.log(`🗑️ Deleted role: @${abbreviation}`);
                }
            } catch (error) {
                console.error('Error deleting role:', error);
            }
        }

        // Delete from database
        await db.deleteLeague(interaction.guildId, abbreviation);

        // Log to league log channel
        const channels = await db.getGuildChannels(interaction.guildId);
        if (channels.league_log) {
            const logChannel = interaction.guild.channels.cache.get(channels.league_log);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('🗑️ League Deleted')
                    .setDescription(`**${league.league_name}** (${abbreviation})`)
                    .addFields(
                        { name: 'Deleted By', value: `${interaction.user}`, inline: true }
                    )
                    .setColor('#FF0000')
                    .setTimestamp();

                await logChannel.send({ embeds: [logEmbed] });
            }
        }

        await interaction.editReply({
            embeds: [successEmbed(
                '🗑️ League Deleted',
                `**${league.league_name}** (${abbreviation}) has been deleted.\n\nThe role has also been removed.`
            )]
        });

    } catch (error) {
        console.error('Error deleting league:', error);
        await interaction.editReply({
            embeds: [errorEmbed('Error', 'Failed to delete league. Please try again.')]
        });
    }
}

async function handleList(interaction) {
    await interaction.deferReply();

    try {
        const leagues = await db.getLeagues(interaction.guildId);

        if (leagues.length === 0) {
            return interaction.editReply({
                embeds: [errorEmbed('No Leagues', 'No leagues found!\n\nUse `/league add` to create a league.')]
            });
        }

        let leagueList = '';
        for (const league of leagues) {
            const role = league.role_id ? `<@&${league.role_id}>` : 'No role';
            leagueList += `**${league.league_abbr}** - ${league.league_name}\n`;
            leagueList += `└ Role: ${role}`;
            if (league.signup_link) {
                leagueList += ` • [Signup](${league.signup_link})`;
            }
            leagueList += '\n\n';
        }

        const embed = new EmbedBuilder()
            .setTitle('🏈 Active Leagues')
            .setDescription(leagueList)
            .setColor('#5865F2')
            .setFooter({ text: `${interaction.guild.name} • ${leagues.length} league(s)` })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('Error listing leagues:', error);
        await interaction.editReply({
            embeds: [errorEmbed('Error', 'Failed to retrieve leagues.')]
        });
    }
}

async function handleRecruit(interaction) {
    if (!await hasCoachPerms(interaction)) {
        return interaction.reply({
            embeds: [errorEmbed('Permission Denied', 'You need Coach role or higher!')],
            ephemeral: true
        });
    }

    const abbreviation = interaction.options.getString('abbreviation').toUpperCase();

    await interaction.deferReply({ ephemeral: true });

    try {
        const league = await db.getLeagueByAbbr(interaction.guildId, abbreviation);
        
        if (!league) {
            return interaction.editReply({
                embeds: [errorEmbed('Not Found', `League **${abbreviation}** doesn't exist!`)]
            });
        }

        // Create recruitment embed
        const recruitEmbed = new EmbedBuilder()
            .setAuthor({
                name: interaction.guild.name,
                iconURL: interaction.guild.iconURL({ dynamic: true })
            })
            .setTitle('🏆 League Recruitment')
            .setDescription(
                `Interested in joining **${league.league_name}**?\n` +
                `Click below to join the league or request a contract.`
            )
            .addFields(
                { 
                    name: '📋 League Info', 
                    value: `**${league.league_name}** | ${abbreviation}`, 
                    inline: false 
                }
            )
            .setColor('#FFD700')
            .setFooter({ text: `${interaction.guild.name} | Recruitment` })
            .setTimestamp();

        // Create buttons
        const buttons = new ActionRowBuilder();

        // Sign Me button (gives role)
        buttons.addComponents(
            new ButtonBuilder()
                .setCustomId(`league_signup_${league.role_id}`)
                .setLabel('Sign Me')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('✍️')
        );

        // Link to League button (if signup link exists)
        if (league.signup_link) {
            buttons.addComponents(
                new ButtonBuilder()
                    .setLabel('Link to League')
                    .setStyle(ButtonStyle.Link)
                    .setURL(league.signup_link)
                    .setEmoji('🔗')
            );
        }

        // Post recruitment message
        await interaction.channel.send({
            embeds: [recruitEmbed],
            components: [buttons]
        });

        await interaction.editReply({
            embeds: [successEmbed(
                '📢 Recruitment Posted',
                `Posted recruitment message for **${league.league_name}**!`
            )]
        });

    } catch (error) {
        console.error('Error posting recruitment:', error);
        await interaction.editReply({
            embeds: [errorEmbed('Error', 'Failed to post recruitment message.')]
        });
    }
}