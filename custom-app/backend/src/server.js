const express = require('express');
const cors = require('cors');
const { initDB } = require('./config/db');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chats');
const messageRoutes = require('./routes/messages');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Init Database
initDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);

app.get('/', (req, res) => {
    res.send('Chat Backend Running');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
