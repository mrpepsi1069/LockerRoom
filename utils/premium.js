// utils/premium.js - Premium feature checks
const db = require('../database');
const config = require('../config.json');

async function isPremiumGuild(guildId) {
    const guild = await db.getGuild(guildId);
    if (!guild || !guild.premium) return false;
    
    // Check if premium expired
    if (guild.premium_expires_at) {
        const expiryDate = new Date(guild.premium_expires_at);
        if (expiryDate < new Date()) {
            // Premium expired, revoke it
            await db.setPremium(guildId, false, null);
            return false;
        }
    }
    
    return true;
}

async function getPremiumStatus(guildId) {
    const guild = await db.getGuild(guildId);
    if (!guild || !guild.premium) {
        return {
            isPremium: false,
            expiresAt: null,
            daysRemaining: null
        };
    }
    
    if (!guild.premium_expires_at) {
        return {
            isPremium: true,
            expiresAt: null,
            daysRemaining: null // Lifetime
        };
    }
    
    const expiryDate = new Date(guild.premium_expires_at);
    const now = new Date();
    const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
    
    return {
        isPremium: expiryDate > now,
        expiresAt: expiryDate,
        daysRemaining: daysRemaining
    };
}

function getPremiumFeatures() {
    return config.premium.features;
}

function getPremiumPrice() {
    return {
        amount: config.premium.price,
        currency: config.premium.currency
    };
}

async function grantPremium(guildId, durationDays = null) {
    let expiresAt = null;
    
    if (durationDays !== null) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + durationDays);
    }
    
    await db.setPremium(guildId, true, expiresAt);
    return { success: true, expiresAt };
}

async function revokePremium(guildId) {
    await db.setPremium(guildId, false, null);
    return { success: true };
}

function formatPremiumExpiry(expiresAt) {
    if (!expiresAt) return 'Lifetime Premium';
    const date = new Date(expiresAt);
    return `<t:${Math.floor(date.getTime() / 1000)}:F>`;
}

module.exports = {
    isPremiumGuild,
    getPremiumStatus,
    getPremiumFeatures,
    getPremiumPrice,
    grantPremium,
    revokePremium,
    formatPremiumExpiry
};