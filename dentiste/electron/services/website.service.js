const axios = require('axios');
const log = require('electron-log');

// The website URL - should be configurable via env
const WEBSITE_API_URL = process.env.WEBSITE_API_URL || 'http://localhost:4000/api/v1';

/**
 * Service to interact with the website's backend API.
 */
const websiteService = {
    /**
     * Fetches the user profile from the website using the given access token.
     * @param {string} token - The access token from the website.
     * @returns {Promise<Object>} - The user profile data.
     */
    async getUserProfile(token) {
        try {
            log.info('[website-service] Fetching profile from website...');
            // Using 127.0.0.1 instead of localhost to avoid IPv6 resolution issues on some Windows setups
            const apiUrl = WEBSITE_API_URL.replace('localhost', '127.0.0.1');

            const response = await axios.get(`${apiUrl}/auth/me`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Origin': 'http://localhost:8082' // Simulate request from the website frontend
                },
                timeout: 5000 // Add a timeout to avoid hanging
            });

            // The website backend returns { success: true, data: { id, email, ... } }
            // according to auth.controller.ts:getMe
            return response.data.data;
        } catch (error) {
            log.error('[website-service] Failed to fetch profile from website:', error.message);
            if (error.response) {
                log.error('[website-service] Response data:', error.response.data);
                log.error('[website-service] Response status:', error.response.status);
            }
            throw new Error('Impossible de recuperer votre profil depuis le site web.');
        }
    },

    /**
     * Validates if the token is still valid.
     * (We could call /auth/me or a dedicated /auth/validate endpoint)
     */
    async validateToken(token) {
        try {
            await this.getUserProfile(token);
            return true;
        } catch (error) {
            return false;
        }
    }
};

module.exports = websiteService;
