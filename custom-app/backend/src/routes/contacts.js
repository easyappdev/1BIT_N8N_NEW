const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const axios = require('axios');

router.use(authenticateToken);

// Middleware to ensure only admins can fetch contacts
router.use((req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can access contacts' });
    }
    next();
});

// GET /api/contacts - Fetch contacts from Evolution API
router.get('/', async (req, res) => {
    const instanceName = process.env.EVOLUTION_INSTANCE_NAME || 'default';
    const apiKey = process.env.EVOLUTION_API_KEY;
    const apiUrl = process.env.EVOLUTION_API_URL;

    console.log(`[CONTACTS] Fetching for instance: ${instanceName} at ${apiUrl}`);

    try {
        // Try getContacts first (cached/stored in DB)
        let response;
        try {
            response = await axios.get(`${apiUrl}/contact/getContacts/${instanceName}`, {
                headers: { 'apikey': apiKey }
            });
            console.log(`[CONTACTS] getContacts success: ${Array.isArray(response.data) ? response.data.length : 'non-array'} items`);
        } catch (getErr) {
            console.warn(`[CONTACTS] getContacts failed, trying fetchContacts...`);
            try {
                response = await axios.get(`${apiUrl}/contact/fetchContacts/${instanceName}`, {
                    headers: { 'apikey': apiKey }
                });
                console.log(`[CONTACTS] fetchContacts success`);
            } catch (fetchErr) {
                console.warn(`[CONTACTS] fetchContacts failed, trying findContacts...`);
                // Standard v2 POST endpoint for searching all
                response = await axios.post(`${apiUrl}/contact/findContacts/${instanceName}`, {}, {
                    headers: { 'apikey': apiKey }
                });
                console.log(`[CONTACTS] findContacts success`);
            }
        }

        res.json(response.data);
    } catch (error) {
        const errorData = error.response?.data || error.message;
        console.error('[CONTACTS] Error details:', JSON.stringify(errorData));
        res.status(500).json({
            error: 'Failed to fetch contacts from WhatsApp',
            debug: errorData,
            url_attempted: `${apiUrl}/contact/getContacts/${instanceName}`
        });
    }
});

module.exports = router;
