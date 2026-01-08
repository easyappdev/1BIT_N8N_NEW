const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://sa1bit:Ob98521@localhost:5432/chat_app',
});

async function createUser() {
    const args = process.argv.slice(2);
    if (args.length !== 3) {
        console.log('Usage: node create_user.js <username> <password> <role>');
        console.log('Roles: admin, operator');
        console.log('Example: node create_user.js agente1 pass123 operator');
        process.exit(1);
    }

    const [username, password, role] = args;

    if (!['admin', 'operator'].includes(role)) {
        console.error('Error: Role must be "admin" or "operator"');
        process.exit(1);
    }

    try {
        await client.connect();

        // Check if user exists
        const check = await client.query('SELECT * FROM users WHERE username = $1', [username]);
        if (check.rows.length > 0) {
            console.log(`User ${username} already exists. Updating password...`);
            await client.query('UPDATE users SET password_hash = $1, role = $2 WHERE username = $3', [password, role, username]);
            console.log('User updated successfully.');
        } else {
            await client.query('INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)', [username, password, role]);
            console.log(`User ${username} created successfully with role ${role}.`);
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

createUser();
