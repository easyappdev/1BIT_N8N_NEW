# 1Bit WhatsApp Platform - Configuration & User Manual

## 1. System Overview
Your platform consists of three main parts working together:
1.  **Evolution API** (`https://evolutionapi.1bit.ar`): connects to WhatsApp servers.
2.  **1Bit Manager App** (`https://wachat.1bit.ar`): the interface for agents/admins to chat and manage AI.
3.  **n8n** (`https://n8n.1bit.ar`): the "Brain" that connects everything. **Crucially, n8n is responsible for receiving messages from WhatsApp and saving them to the database so they appear in the App.**

---

## 2. Initial Configuration (Required)

### Step 1: Connect WhatsApp
1.  Go to **[https://evolutionapi.1bit.ar](https://evolutionapi.1bit.ar)**.
2.  Login with your API Key (default is often in your `.env` as `AUTHENTICATION_API_KEY` or `simplekey123`).
3.  Create a new Instance (e.g., named "default").
4.  Scan the QR Code with your WhatsApp mobile app.
5.  **Verify**: Ensure the status says "Connected".

### Step 2: Configure Message Routing (n8n)
**Important**: The "1Bit Manager" interface shows *database records*. It does not receive messages directly from WhatsApp. You must set up an n8n workflow to bridge this gap.

1.  Access **[https://n8n.1bit.ar](https://n8n.1bit.ar)**.
2.  Create a new Workflow.
3.  **Trigger**: Add a `Webhook` node.
    - Path: `/whatsapp-incoming`
    - Method: POST
4.  **Action**: Add a `Postgres` node.
    - **Credentials**:
        - Host: `postgres` (internal Docker hostname)
        - User: `sa1bit` (or `user1bit`)
        - Password: `Ob98521` (from your `.env`)
        - Database: `chat_app` (Note: ensure this matches your backend DB name, typically `chat_app` or `evolution`)
    - **Operation**: `Insert` into table `chats` (if new) and `messages`.
    - *Tip*: You basically mapping the incoming JSON from Evolution API to the table columns (`content`, `sender_name`, `whatsapp_id`).
5.  **Connect**: Go back to **Evolution API** -> **Instance Settings** -> **Webhooks**.
    - URL: `http://n8n:5678/webhook/whatsapp-incoming` (Internal Docker URL is best/fastest) OR `https://n8n.1bit.ar/webhook/whatsapp-incoming`.
    - Events: Check `MESSAGES_UPSERT`.

---

## 3. Using the 1Bit Manager

Once n8n is processing messages, they will appear in your App.

### Access
- **URL**: [https://wachat.1bit.ar](https://wachat.1bit.ar)
- **Login**: `admin` / `admin123`

### Features
- **Chat List**: Shows all conversations stored in the database.
- **AI Toggle**:
    - **Enabled (🤖)**: The AI (via n8n) is allowed to reply to this user.
    - **Disabled (👤)**: The AI is paused. You (the human) can type a reply.
    - *Note*: Sending a manual message automatically disables the AI for that chat to prevent interference.
- **Attachments**: You can paste images directly into the chat or use the paperclip icon.

## 4. Troubleshooting

**"Select a chat to start messaging" (Empty Screen)**
- This means the `chats` table in the database is empty.
- **Fix**: Send a message to your connected WhatsApp number. Check n8n to ensure the workflow received it and inserted it into the database.

**Login Failed**
- Ensure you are using the plain text password `admin123`.
- If you just rebuilt the DB, you may need to reset the admin user using the command line script.

**Messages not sending**
- Check if the Evolution API instance is still connected.
- Check the `chat-backend` logs for errors (`docker logs chat-backend-wachat`).
