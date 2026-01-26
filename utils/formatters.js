// utils/formatters.js - Text formatting utilities

function formatDate(date) {
    return `<t:${Math.floor(date.getTime() / 1000)}:F>`;
}

function formatDateShort(date) {
    return `<t:${Math.floor(date.getTime() / 1000)}:f>`;
}

function formatRelativeTime(date) {
    return `<t:${Math.floor(date.getTime() / 1000)}:R>`;
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
}

function truncateText(text, maxLength = 100) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

function capitalizeFirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function formatUserList(users, separator = ', ') {
    return users.map(u => `<@${u}>`).join(separator);
}

function formatNumber(num) {
    return num.toLocaleString();
}

module.exports = {
    formatDate,
    formatDateShort,
    formatRelativeTime,
    formatUptime,
    truncateText,
    capitalizeFirst,
    formatUserList,
    formatNumber
};