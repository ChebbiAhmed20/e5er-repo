const crypto = require('crypto');

const generateUUID = () => {
    return crypto.randomUUID();
};

const generateReferralCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
};

module.exports = {
    generateUUID,
    generateReferralCode
};