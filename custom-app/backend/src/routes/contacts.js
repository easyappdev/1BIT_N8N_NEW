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
        // Try getContacts first (GET)
        let response;
        try {
            response = await axios.get(`${apiUrl}/chat/getContacts/${instanceName}`, {
                headers: { 'apikey': apiKey }
            });
            console.log(`[CONTACTS] getContacts success: ${Array.isArray(response.data) ? response.data.length : 'non-array'} items`);
        } catch (getErr) {
            console.warn(`[CONTACTS] getContacts failed, trying findContacts...`);
            // In v2, findContacts is often POST /chat/findContacts/:instance
            response = await axios.post(`${apiUrl}/chat/findContacts/${instanceName}`, {
                where: {} // Fetch all
            }, {
                headers: { 'apikey': apiKey }
            });
            console.log(`[CONTACTS] findContacts success`);
        }

        // 3. Fallback: fetchAllGroups (Specific for groups)
        let groups = [];
        try {
            const groupsRes = await axios.get(`${apiUrl}/group/fetchAllGroups/${instanceName}`, {
                headers: { 'apikey': apiKey }
            });
            groups = Array.isArray(groupsRes.data) ? groupsRes.data : [];
        } catch (gErr) {
            console.error("Error fetching groups:", gErr.message);
        }

        // Normalize contacts and groups
        const normalizedContacts = (Array.isArray(response.data) ? response.data : []).map(c => ({
            id: c.remoteJid || c.jid || c.id,
            name: c.subject || c.pushName || c.profileName || c.name || c.verifiedName || null,
            isGroup: (c.remoteJid || c.jid || "").includes('@g.us')
        }));

        const normalizedGroups = groups.map(g => ({
            id: g.id || g.remoteJid,
            name: g.subject || g.name || null,
            isGroup: true
        }));

        // Merge and remove duplicates (preferring group subject if available)
        const all = [...normalizedGroups, ...normalizedContacts];
        const unique = {};
        all.forEach(item => {
            if (!item.id) return;
            if (!unique[item.id] || (item.name && !unique[item.id].name)) {
                unique[item.id] = item;
            }
        });

        res.json(Object.values(unique).filter(i => i.name));
    } catch (error) {
        console.error('Final contact fetch error:', error.message);
        res.status(500).json({
            error: 'Failed to fetch contacts after multiple attempts',
            details: error.message
        });
    }
});

module.exports = router;
