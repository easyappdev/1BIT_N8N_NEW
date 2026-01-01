const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const privacyMiddleware = require('../middleware/privacy');

router.use(authenticateToken);
router.use(privacyMiddleware); // Apply privacy filter to all responses in this router only if desired, or specifically on message content

router.get('/', async (req, res) => {
    try {
        let query = 'SELECT * FROM chats';
        let params = [];

        if (req.user.role === 'operator') {
            query += ' WHERE assigned_user_id = $1';
            params.push(req.user.id);
        }

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Endpoint to toggle AI status (Admin or Assigned Operator?) 
// Assuming Operator can also toggle it for their chats.
router.patch('/:whatsappId/ai', async (req, res) => {
    const { whatsappId } = req.params;
    const { enabled } = req.body; // true or false

    try {
        // Check permission
        let checkQuery = 'SELECT * FROM chats WHERE whatsapp_id = $1';
        let checkParams = [whatsappId];

        if (req.user.role === 'operator') {
            checkQuery += ' AND assigned_user_id = $2';
            checkParams.push(req.user.id);
        }

        const checkRes = await pool.query(checkQuery, checkParams);
        if (checkRes.rows.length === 0) return res.status(403).json({ error: 'Not found or permission denied' });

        await pool.query('UPDATE chats SET ai_enabled = $1 WHERE whatsapp_id = $2', [enabled, whatsappId]);
        res.json({ success: true, ai_enabled: enabled });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
