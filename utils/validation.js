// utils/validation.js - Input validation helpers

function isValidHexColor(color) {
    return /^#[0-9A-F]{6}$/i.test(color);
}

function isValidURL(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

function isValidTimeFormat(time) {
    // Validates times like "7:30 PM", "19:30", "7:30PM"
    return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]\s?(AM|PM|am|pm)?$/.test(time);
}

function sanitizeInput(input, maxLength = 200) {
    if (!input) return '';
    return input.trim().slice(0, maxLength);
}

function isValidLeagueAbbr(abbr) {
    // 2-10 characters, alphanumeric only
    return /^[A-Z0-9]{2,10}$/i.test(abbr);
}

function parseTimeString(timeString) {
    // Parse various time formats and return Date object
    const date = new Date(timeString);
    if (isNaN(date.getTime())) {
        return null;
    }
    return date;
}

function validateSeason(season) {
    // Validates season format like "S1", "Season 1", "2024", etc.
    return season && season.length >= 1 && season.length <= 20;
}

module.exports = {
    isValidHexColor,
    isValidURL,
    isValidTimeFormat,
    sanitizeInput,
    isValidLeagueAbbr,
    parseTimeString,
    validateSeason
};