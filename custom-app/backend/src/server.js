const express = require('express');
const cors = require('cors');
const { initDB } = require('./config/db');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chats');
const messageRoutes = require('./routes/messages');
const userRoutes = require('./routes/users');
const contactRoutes = require('./routes/contacts');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});
app.use('/uploads', express.static('uploads'));

// Init Database
initDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contacts', contactRoutes);

app.get('/api/ping', (req, res) => {
    console.log(`[DIAGNOSTIC] Ping request at ${new Date().toISOString()}`);
    res.json({
        status: 'ok',
        version: 'v2.2-Nodemon',
        sync: 'Active',
        message: 'If you see this, code synchronization is working!'
    });
});

app.get('/', (req, res) => {
    res.send('Chat Backend Running');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} [VERSION: v2.2-Nodemon]`);
});
