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
    try {
        const instanceName = process.env.EVOLUTION_INSTANCE_NAME || 'default';
        const apiKey = process.env.EVOLUTION_API_KEY;
        const apiUrl = process.env.EVOLUTION_API_URL;

        // Fetch contacts from Evolution API
        // endpoint: /contact/getContacts/:instance
        const response = await axios.get(`${apiUrl}/contact/getContacts/${instanceName}`, {
            headers: { 'apikey': apiKey }
        });

        // Filter or map data if necessary. Evolution usually returns an array of contacts.
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching contacts from Evolution:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch contacts from WhatsApp' });
    }
});

module.exports = router;
