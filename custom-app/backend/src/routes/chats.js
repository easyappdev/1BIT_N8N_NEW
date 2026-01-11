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

// Assign chat to a user (Admin only)
router.patch('/assign', async (req, res) => {
    const { whatsappId, userId, historyLimit } = req.body;
    const limit = parseInt(historyLimit) || 5;

    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can assign chats' });
        }

        let visibilityAt = new Date(); // Default: now

        if (userId !== null) {
            const userRes = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
            if (userRes.rows.length === 0) return res.status(404).json({ error: 'Target user not found' });

            // Calculate history_visibility_at
            // Find the N-th message from now backwards
            const msgQuery = `
                SELECT timestamp FROM messages 
                WHERE chat_id = $1 
                ORDER BY timestamp DESC 
                OFFSET $2 LIMIT 1
            `;
            const msgRes = await pool.query(msgQuery, [whatsappId, limit - 1]);

            if (msgRes.rows.length > 0) {
                visibilityAt = msgRes.rows[0].timestamp;
            } else {
                // If fewer messages exist, show from the very first message
                const firstMsg = await pool.query('SELECT timestamp FROM messages WHERE chat_id = $1 ORDER BY timestamp ASC LIMIT 1', [whatsappId]);
                if (firstMsg.rows.length > 0) {
                    visibilityAt = firstMsg.rows[0].timestamp;
                }
            }
        }

        await pool.query(
            'UPDATE chats SET assigned_user_id = $1, history_visibility_at = $2 WHERE whatsapp_id = $3',
            [userId, visibilityAt, whatsappId]
        );

        res.json({ success: true, assigned_user_id: userId, history_visibility_at: visibilityAt });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create or get chat (Admin only)
router.post('/', async (req, res) => {
    const { whatsappId, contactName } = req.body;

    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can initiate new chats' });
        }

        // Check if chat already exists
        const existingChat = await pool.query('SELECT * FROM chats WHERE whatsapp_id = $1', [whatsappId]);

        if (existingChat.rows.length > 0) {
            return res.json(existingChat.rows[0]);
        }

        // Create new chat
        const newChat = await pool.query(
            'INSERT INTO chats (whatsapp_id, contact_name, ai_enabled) VALUES ($1, $2, $3) RETURNING *',
            [whatsappId, contactName || whatsappId, false] // AI disabled by default for new manual chats
        );

        res.status(201).json(newChat.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error creating chat' });
    }
});

module.exports = router;
