const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Admins only.' });
    }
    next();
};

router.use(isAdmin);

// List all users
router.get('/', async (req, res) => {
    try {
        // 'created_at' column does not exist in schema, removed it.
        const result = await pool.query("SELECT id, username, role FROM users WHERE role = 'operator' ORDER BY id ASC");
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// Create User
router.post('/', async (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password || !role) return res.status(400).json({ error: 'Missing fields' });

    try {
        // Check existing
        const check = await pool.query('SELECT 1 FROM users WHERE username = $1', [username]);
        if (check.rows.length > 0) return res.status(400).json({ error: 'Username already exists' });

        // Insert (Plain text password as per project setting)
        const result = await pool.query(
            'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role',
            [username, password, role]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete User
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    // Prevent deleting self?
    if (parseInt(id) === req.user.id) {
        return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    try {
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
