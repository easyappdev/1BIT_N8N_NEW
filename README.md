# 1Bit WhatsApp Multi-Agent Platform

## Overview
This platform integrates specific business logic with WhatsApp using the **Evolution API** and a custom **Node.js/React** application stack. It enables:
- **Role-Based Access**: Admins and Operators.
- **AI Automation**: Integration with Gemini via n8n.
- **Privacy Controls**: Masking sensitive data for operators.
- **Media Support**: Sending and receiving images, audio, and documents.

## Architecture

```mermaid
graph TD
    A[Frontend (Next.js)] -->|HTTPS| B[Backend (Node.js)]
    B -->|SQL| D[Postgres DB]
    B -->|HTTP| E[Evolution API]
    E -->|WS| F[WhatsApp Web]
    G[n8n Automation] -->|Webhook| B
    G -->|SQL| D
```

## Services & Domains
- **Chat Frontend**: [`https://wachat.1bit.ar`](https://wachat.1bit.ar)
- **Backend API**: [`https://wachatapi.1bit.ar`](https://wachatapi.1bit.ar)
- **Evolution API**: [`https://evolutionapi.1bit.ar`](https://evolutionapi.1bit.ar)

## Installation

1.  **Prerequisites**: Docker & Docker Compose installed.
2.  **Configuration**: Ensure your `.env` file has the correct `ENCRYPTION_KEY`, `POSTGRES_PASSWORD`, etc.
3.  **Run**:
    ```bash
    docker-compose down
    docker-compose up -d --build
    ```
4.  **Database**:
    The system automatically creates `chat_app` and `evolution` databases on first run via `init-data.sh`.

## Usage Manual

### Login
-   Access `https://wachat.1bit.ar`.
-   **Default Admin**: `admin` / `admin123`.

### Chat Interface
-   **Left Sidebar**: Shows active chats. A **green** robot icon indicates AI is active. A **gray** user icon indicates Manual mode.
-   **Conversation**:
    -   Type messages to reply.
    -   Click the **Paperclip (📎)** to attach images or files.
    -   **Paste (Ctrl+V)** images directly into the chat to upload them.
-   **AI Control**:
    -   When you send a message, AI is automatically **Disabled** for that chat.
    -   Re-enable it manually by checking the "AI Enabled" box in the chat header.

### Roles & Privacy
-   **Operators**: Create operator users in the database. Operators cannot see prices (masked as `$***`).
-   Operators only see chats assigned to them (via `assigned_user_id`).

### n8n Integration
-   Use the queries in `custom-app/n8n-queries.sql` to build your workflows.
-   **Trigger**: Webhook from Evolution API.
-   **Logic**: Check `ai_enabled` in DB before processing with Gemini.

## Troubleshooting
-   **Media not loading?**: Ensure `wachatapi.1bit.ar` is reachable and SSL is valid.
-   **WhatsApp keys?**: Configure the instance in Evolution API UI first (`https://evolutionapi.1bit.ar`).
