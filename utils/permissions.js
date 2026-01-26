// utils/permissions.js - Permission checking functions
const db = require('../database');

async function isOwner(userId) {
    return userId === process.env.OWNER_ID;
}

async function isAdmin(interaction) {
    return interaction.member.permissions.has('Administrator');
}

async function isManager(interaction) {
    const roles = await db.getGuildRoles(interaction.guildId);
    if (!roles.manager) return false;
    return interaction.member.roles.cache.has(roles.manager);
}

async function isStaff(interaction) {
    const roles = await db.getGuildRoles(interaction.guildId);
    if (!roles.staff) return false;
    return interaction.member.roles.cache.has(roles.staff);
}

async function hasManagerPerms(interaction) {
    // Check if user is admin, manager, or owner
    if (await isOwner(interaction.user.id)) return true;
    if (await isAdmin(interaction)) return true;
    if (await isManager(interaction)) return true;
    return false;
}

async function hasStaffPerms(interaction) {
    // Check if user has staff perms or higher
    if (await hasManagerPerms(interaction)) return true;
    if (await isStaff(interaction)) return true;
    return false;
}

async function checkPremium(guildId) {
    const guild = await db.getGuild(guildId);
    if (!guild) return false;
    
    // Check if premium and not expired
    if (guild.premium) {
        if (!guild.premium_expires_at) return true; // Lifetime premium
        if (new Date(guild.premium_expires_at) > new Date()) return true;
    }
    
    return false;
}

async function requireSetup(interaction) {
    const guild = await db.getGuild(interaction.guildId);
    return guild && guild.setup_completed;
}

module.exports = {
    isOwner,
    isAdmin,
    isManager,
    isStaff,
    hasManagerPerms,
    hasStaffPerms,
    checkPremium,
    requireSetup
};