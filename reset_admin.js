const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Docker container has env vars injected, so we use them directly.
// We use a fallback connection string just in case, but Env should be present.

console.log('--- Manual Admin Reset Script ---');

const dbConfig = {
    connectionString: process.env.DATABASE_URL
};

if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is missing.');
    process.exit(1);
}

const pool = new Pool(dbConfig);

async function run() {
    let client;
    try {
        console.log('1. Connecting to Database...');
        client = await pool.connect();

        console.log('2. Deleting existing admin user...');
        await client.query("DELETE FROM users WHERE username = 'admin'");

        console.log('3. Setting plain password "admin123" (No Encryption)...');
        const hash = 'admin123';

        console.log('4. Inserting new admin user...');
        await client.query(
            "INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)",
            ['admin', hash, 'admin']
        );

        console.log('SUCCESS: Admin user has been reset.');
        console.log('You can now login with: admin / admin123');

    } catch (e) {
        console.error('CRITICAL ERROR:', e);
    } finally {
        if (client) client.release();
        pool.end();
    }
}

run();
