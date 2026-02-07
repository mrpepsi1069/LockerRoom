// utils/permissions.js - Updated without premium functions
const db = require('../database');

async function hasOwnerPerms(interaction) {
    // Server owner always has permission
    if (interaction.guild.ownerId === interaction.user.id) {
        return true;
    }

    // Check for Owner role from setup
    const roles = await db.getGuildRoles(interaction.guildId);
    if (roles.owner) {
        return interaction.member.roles.cache.has(roles.owner);
    }

    return false;
}

async function hasCoachPerms(interaction) {
    // Server owner always has permission
    if (interaction.guild.ownerId === interaction.user.id) {
        return true;
    }

    const roles = await db.getGuildRoles(interaction.guildId);
    
    // Check Owner role
    if (roles.owner && interaction.member.roles.cache.has(roles.owner)) {
        return true;
    }

    // Check Coach role
    if (roles.coach && interaction.member.roles.cache.has(roles.coach)) {
        return true;
    }

    return false;
}

// Alias for backwards compatibility
async function hasManagerPerms(interaction) {
    return await hasCoachPerms(interaction);
}

async function hasStaffPerms(interaction) {
    return await hasCoachPerms(interaction);
}

module.exports = {
    hasOwnerPerms,
    hasCoachPerms,
    hasManagerPerms,
    hasStaffPerms
};