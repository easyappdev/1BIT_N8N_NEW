-- Query to Check if AI Enabled for a user
-- Input: $json.body.data.key.remoteJid (from Evolution Webhook)
SELECT ai_enabled, name FROM chats WHERE whatsapp_id = '{{$json.body.data.key.remoteJid}}';

-- Query to Get Chat History Context
-- Input: $json.body.data.key.remoteJid
SELECT sender_name, content FROM messages 
WHERE chat_id = '{{$json.body.data.key.remoteJid}}' 
ORDER BY timestamp DESC 
LIMIT 10;

-- Query to Disable AI (if Human Operator intervenes from n8n logic? Usually handled by App Backend)
UPDATE chats SET ai_enabled = false WHERE whatsapp_id = '{{$json.body.data.key.remoteJid}}';

-- Query to Create/Update Chat (Upsert) - Useful if n8n receives first message
INSERT INTO chats (whatsapp_id, name, ai_enabled)
VALUES ('{{$json.body.data.key.remoteJid}}', '{{$json.body.data.pushName}}', true)
ON CONFLICT (whatsapp_id) DO NOTHING;

-- Query to Insert Incoming Message (from User/WhatsApp)
INSERT INTO messages (chat_id, sender_name, content, user_id)
VALUES ('{{$json.body.data.key.remoteJid}}', '{{$json.body.data.pushName}}', '{{$json.body.data.message.conversation}}', NULL);
