const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const initDB = async () => {
  const client = await pool.connect();
  try {
    // Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'operator'))
      );
    `);

    // Chats Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS chats (
        whatsapp_id VARCHAR(50) PRIMARY KEY,
        assigned_user_id INTEGER REFERENCES users(id),
        ai_enabled BOOLEAN DEFAULT TRUE,
        name VARCHAR(100),
        history_visibility_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Messages Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        chat_id VARCHAR(50) REFERENCES chats(whatsapp_id),
        sender_name VARCHAR(100),
        content TEXT,
        media_type VARCHAR(50), -- image, audio, document
        media_url TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_id INTEGER REFERENCES users(id) -- NULL if from client (WhatsApp)
      );
    `);

    // Seed Admin User if not exists (password: admin123)
    const res = await client.query('SELECT * FROM users WHERE username = $1', ['admin']);
    if (res.rows.length === 0) {
      const hash = 'admin123'; // Storing plain text as requested
      await client.query('INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)', ['admin', hash, 'admin']);
      console.log('Admin user created');
    }

    // Safety: Add history_visibility_at if it doesn't exist (migrations)
    try {
      await client.query('ALTER TABLE chats ADD COLUMN IF NOT EXISTS history_visibility_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    } catch (columnErr) {
      // Column might exist or other issue, log but don't stop
    }

    console.log('Database tables initialized');
  } catch (err) {
    console.error('Error initializing database', err);
  } finally {
    client.release();
  }
};

module.exports = { pool, initDB };
