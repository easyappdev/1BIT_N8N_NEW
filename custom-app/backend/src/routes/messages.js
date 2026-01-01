const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const privacyMiddleware = require('../middleware/privacy');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Appending extension
    }
});
const upload = multer({ storage: storage });

router.use(authenticateToken);
router.use(privacyMiddleware);

// Get messages for a chat
router.get('/:chatId', async (req, res) => {
    const { chatId } = req.params;

    try {
        if (req.user.role === 'operator') {
            const chatRes = await pool.query('SELECT 1 FROM chats WHERE whatsapp_id = $1 AND assigned_user_id = $2', [chatId, req.user.id]);
            if (chatRes.rows.length === 0) return res.status(403).json({ error: 'Access denied' });
        }

        const result = await pool.query('SELECT * FROM messages WHERE chat_id = $1 ORDER BY timestamp ASC LIMIT 100', [chatId]);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Send message (Text or Media)
router.post('/', upload.single('file'), async (req, res) => {
    const { chatId, content } = req.body;
    const file = req.file;

    try {
        let mediaType = null;
        let mediaUrl = null;

        if (file) {
            // Construct public URL (assuming backend is reachable)
            // In local docker stack, it's relative. Frontend uses full URL.
            mediaUrl = `/uploads/${file.filename}`;

            const mime = file.mimetype;
            if (mime.startsWith('image/')) mediaType = 'image';
            else if (mime.startsWith('audio/')) mediaType = 'audio';
            else mediaType = 'document'; // default fallback
        }

        // 1. Save to DB
        const result = await pool.query(
            'INSERT INTO messages (chat_id, sender_name, content, user_id, media_type, media_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [chatId, req.user.username, content || '', req.user.id, mediaType, mediaUrl]
        );

        // 2. Disable AI
        await pool.query('UPDATE chats SET ai_enabled = false WHERE whatsapp_id = $1', [chatId]);

        // 3. Send via Evolution API
        try {
            const instanceName = process.env.EVOLUTION_INSTANCE_NAME || 'default';
            const apiKey = process.env.EVOLUTION_API_KEY;
            // Construct FULL URL for Evolution API to download the media (must be accessible from Evolution container)
            // Since both are in same network, we can use container name http://chat-backend:3001/uploads/...
            // But for outside world (user viewing), it's https://wachatapi.1bit.ar/uploads...
            const internalMediaUrl = file ? `http://chat-backend:3001/uploads/${file.filename}` : null;

            if (file) {
                let endpoint = 'sendText'; // Fallback
                let payload = {
                    number: chatId,
                    options: { delay: 1200, presence: "composing" }
                };

                if (mediaType === 'image') {
                    endpoint = 'sendMedia'; // Check Evolution API docs, usually sendMedia or sendImage
                    // Evolution v1.6+ uses sendMedia for everything or specific endpoints
                    // Assuming 'sendMedia' generic or specific
                    // Let's use specific if available or generic structure
                    payload.mediaMessage = {
                        mediatype: "image",
                        caption: content || "",
                        media: internalMediaUrl
                    }
                } else if (mediaType === 'audio') {
                    endpoint = 'sendWhatsAppAudio';
                    payload.audioMessage = {
                        audio: internalMediaUrl
                    }
                } else {
                    endpoint = 'sendMedia'; // Document
                    payload.mediaMessage = {
                        mediatype: "document",
                        caption: content || file.originalname,
                        media: internalMediaUrl
                    }
                }

                // NOTE: Verify endpoint names for specific Evolution version. 
                // Common is /message/sendMedia
                await axios.post(`${process.env.EVOLUTION_API_URL}/message/${endpoint}/${instanceName}`, payload, {
                    headers: { 'apikey': apiKey }
                });

            } else {
                // Text only
                await axios.post(`${process.env.EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
                    number: chatId,
                    options: { delay: 1200, presence: "composing" },
                    textMessage: { text: content }
                }, { headers: { 'apikey': apiKey } });
            }
        } catch (apiErr) {
            console.error("Evolution API Error", apiErr.message);
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
