// commands/contract.js - Player contract management
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { hasCoachPerms } = require('../utils/permissions');
const { successEmbed, errorEmbed } = require('../utils/embeds');
const db = require('../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('contract')
        .setDescription('Manage player contracts')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a player contract')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Player to contract')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('position')
                        .setDescription('Player position (e.g., QB, WR, RB)')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Contract amount (in dollars)')
                        .setRequired(true)
                        .setMinValue(0))
                .addStringOption(option =>
                    option.setName('due')
                        .setDescription('Payment due date (e.g., "Feb 15, 2026")')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('terms')
                        .setDescription('Contract terms/details (optional)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a player contract')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Player whose contract to remove')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('post')
                .setDescription('Post all active contracts')
                .addStringOption(option =>
                    option.setName('filter')
                        .setDescription('Filter contracts')
                        .addChoices(
                            { name: 'All Contracts', value: 'all' },
                            { name: 'Unpaid Only', value: 'unpaid' },
                            { name: 'Paid Only', value: 'paid' }
                        )
                        .setRequired(false))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'add':
                return await handleAdd(interaction);
            case 'remove':
                return await handleRemove(interaction);
            case 'post':
                return await handlePost(interaction);
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

    const user = interaction.options.getUser('user');
    const position = interaction.options.getString('position').toUpperCase();
    const amount = interaction.options.getInteger('amount');
    const due = interaction.options.getString('due');
    const terms = interaction.options.getString('terms') || 'Standard player contract';

    await interaction.deferReply({ ephemeral: true });

    try {
        // Get contract channel from setup
        const channels = await db.getGuildChannels(interaction.guildId);
        
        if (!channels.contract) {
            return interaction.editReply({
                embeds: [errorEmbed('Setup Required', 'Please run `/setup` first to configure the contract channel!')]
            });
        }

        const contractChannel = interaction.guild.channels.cache.get(channels.contract);
        
        if (!contractChannel) {
            return interaction.editReply({
                embeds: [errorEmbed('Channel Not Found', 'Contract channel no longer exists. Please run `/setup` again!')]
            });
        }

        // Check if player already has a contract
        const existing = await db.getPlayerContract(interaction.guildId, user.id);
        if (existing) {
            return interaction.editReply({
                embeds: [errorEmbed('Contract Exists', `${user} already has an active contract!\n\nUse \`/contract remove\` first to create a new one.`)]
            });
        }

        // Create contract embed
        const contractEmbed = new EmbedBuilder()
            .setTitle('📜 PLAYER CONTRACT')
            .setDescription(`**${interaction.guild.name}** has contracted a new player!`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '👤 Player', value: `${user}`, inline: true },
                { name: '🎮 Position', value: position, inline: true },
                { name: '\u200b', value: '\u200b', inline: true },
                { name: '💰 Amount', value: `$${amount.toLocaleString()}`, inline: true },
                { name: '📅 Due Date', value: due, inline: true },
                { name: '💳 Paid', value: '❌ **NO**', inline: true },
                { name: '📋 Terms', value: terms, inline: false },
                { name: '✍️ Contracted By', value: `${interaction.user}`, inline: false }
            )
            .setColor('#FFD700')
            .setFooter({ text: `Contract • ${interaction.guild.name}` })
            .setTimestamp();

        // Buttons for contract management
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`contract_paid_${user.id}`)
                    .setLabel('Mark as Paid')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💰'),
                new ButtonBuilder()
                    .setCustomId(`contract_delete_${user.id}`)
                    .setLabel('Delete Contract')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🗑️')
            );

        // Post to contract channel
        const message = await contractChannel.send({
            content: `🎉 **NEW CONTRACT!** Welcome ${user} to the team!`,
            embeds: [contractEmbed],
            components: [buttons]
        });

        // Store in database
        await db.addContract(
            interaction.guildId,
            user.id,
            position,
            amount,
            due,
            terms,
            false, // paid status
            message.id,
            interaction.user.id
        );

        // DM the player
        try {
            const dmEmbed = new EmbedBuilder()
                .setTitle('🎉 Congratulations!')
                .setDescription(`You've been contracted to **${interaction.guild.name}**!`)
                .addFields(
                    { name: '🎮 Position', value: position, inline: true },
                    { name: '💰 Amount', value: `$${amount.toLocaleString()}`, inline: true },
                    { name: '📅 Due Date', value: due, inline: true },
                    { name: '📋 Terms', value: terms, inline: false },
                    { name: '🚀 Next Steps', value: '• Check team Discord regularly\n• Payment due by the date above\n• Be an active team member!', inline: false }
                )
                .setColor('#00FF00')
                .setFooter({ text: `Welcome to ${interaction.guild.name}!` })
                .setTimestamp();

            await user.send({ embeds: [dmEmbed] });
        } catch (error) {
            console.log(`Could not DM ${user.tag} about their contract`);
        }

        await interaction.editReply({
            embeds: [successEmbed(
                '✅ Contract Created',
                `Contract for ${user} has been posted to ${contractChannel}!\n\n**Position:** ${position}\n**Amount:** $${amount.toLocaleString()}\n**Due:** ${due}`
            )]
        });

    } catch (error) {
        console.error('Error creating contract:', error);
        await interaction.editReply({
            embeds: [errorEmbed('Error', 'Failed to create contract. Please try again.')]
        });
    }
}

async function handleRemove(interaction) {
    if (!await hasCoachPerms(interaction)) {
        return interaction.reply({
            embeds: [errorEmbed('Permission Denied', 'You need Coach role or higher!')],
            ephemeral: true
        });
    }

    const user = interaction.options.getUser('user');

    await interaction.deferReply({ ephemeral: true });

    try {
        const contract = await db.getPlayerContract(interaction.guildId, user.id);
        
        if (!contract) {
            return interaction.editReply({
                embeds: [errorEmbed('Not Found', `${user} doesn't have an active contract!`)]
            });
        }

        // Get contract channel
        const channels = await db.getGuildChannels(interaction.guildId);
        const contractChannel = interaction.guild.channels.cache.get(channels.contract);

        // Try to delete the contract message
        if (contractChannel && contract.messageId) {
            try {
                const message = await contractChannel.messages.fetch(contract.messageId);
                await message.delete();
            } catch (error) {
                console.log('Could not delete contract message:', error);
            }
        }

        // Remove from database
        await db.removeContract(interaction.guildId, user.id);

        await interaction.editReply({
            embeds: [successEmbed(
                '🗑️ Contract Removed',
                `Removed contract for ${user}\n\n**Position:** ${contract.position}\n**Amount:** $${contract.amount.toLocaleString()}`
            )]
        });

    } catch (error) {
        console.error('Error removing contract:', error);
        await interaction.editReply({
            embeds: [errorEmbed('Error', 'Failed to remove contract. Please try again.')]
        });
    }
}

async function handlePost(interaction) {
    const filter = interaction.options.getString('filter') || 'all';

    await interaction.deferReply();

    try {
        const contracts = await db.getAllContracts(interaction.guildId);

        if (contracts.length === 0) {
            return interaction.editReply({
                embeds: [errorEmbed('No Contracts', 'No contracts found!\n\nUse `/contract add` to create player contracts.')]
            });
        }

        // Filter contracts
        let filteredContracts = contracts;
        if (filter === 'unpaid') {
            filteredContracts = contracts.filter(c => !c.paid);
        } else if (filter === 'paid') {
            filteredContracts = contracts.filter(c => c.paid);
        }

        if (filteredContracts.length === 0) {
            return interaction.editReply({
                embeds: [errorEmbed('No Contracts', `No ${filter} contracts found!`)]
            });
        }

        // Build contracts list
        let contractsList = '';
        let totalUnpaid = 0;
        let totalPaid = 0;

        for (const contract of filteredContracts) {
            const user = await interaction.client.users.fetch(contract.userId).catch(() => null);
            if (!user) continue;

            const paidStatus = contract.paid ? '✅ PAID' : '❌ UNPAID';
            const paidEmoji = contract.paid ? '💚' : '💰';
            
            contractsList += `${paidEmoji} **${user.username}** - ${contract.position}\n`;
            contractsList += `└ Amount: $${contract.amount.toLocaleString()} | Due: ${contract.due} | ${paidStatus}\n\n`;

            if (contract.paid) {
                totalPaid += contract.amount;
            } else {
                totalUnpaid += contract.amount;
            }
        }

        const filterText = {
            'all': 'All Contracts',
            'unpaid': 'Unpaid Contracts',
            'paid': 'Paid Contracts'
        }[filter];

        const embed = new EmbedBuilder()
            .setTitle(`📋 ${filterText}`)
            .setDescription(contractsList || 'No contracts found')
            .addFields(
                { name: '💰 Total Unpaid', value: `$${totalUnpaid.toLocaleString()}`, inline: true },
                { name: '💚 Total Paid', value: `$${totalPaid.toLocaleString()}`, inline: true },
                { name: '📊 Total Contracts', value: `${filteredContracts.length}`, inline: true }
            )
            .setColor('#5865F2')
            .setFooter({ text: `${interaction.guild.name} • Contract Overview` })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('Error posting contracts:', error);
        await interaction.editReply({
            embeds: [errorEmbed('Error', 'Failed to retrieve contracts.')]
        });
    }
}