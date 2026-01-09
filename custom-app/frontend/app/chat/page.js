'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '../lib/api';

export default function ChatPage() {
    const [chats, setChats] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [users, setUsers] = useState([]);
    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/');
            return;
        }
        fetchChats();
        if (localStorage.getItem('role') === 'admin') {
            fetchUsers();
        }
        const interval = setInterval(fetchChats, 10000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        let interval;
        if (selectedChat) {
            fetchMessages(selectedChat.whatsapp_id);
            interval = setInterval(() => fetchMessages(selectedChat.whatsapp_id), 3000);
        }
        return () => clearInterval(interval);
    }, [selectedChat]);

    // Handle Paste (Images)
    useEffect(() => {
        const handlePaste = (e) => {
            if (!selectedChat) return;
            const items = e.clipboardData.items;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const blob = items[i].getAsFile();
                    sendFile(blob);
                }
            }
        };
        document.addEventListener('paste', handlePaste);
        return () => document.removeEventListener('paste', handlePaste);
    }, [selectedChat]);

    // Auto Scroll to bottom whenever messages change
    useEffect(() => {
        const timer = setTimeout(() => {
            if (messagesEndRef.current) {
                // 'auto' instead of 'smooth' can be more reliable for initial load
                messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
            }
        }, 100);
        return () => clearTimeout(timer);
    }, [messages]);

    const fetchUsers = async () => {
        try {
            const res = await api.get('/users');
            setUsers(res.data);
        } catch (err) {
            console.error("Error fetching users", err);
        }
    };

    const assignChat = async (userId) => {
        if (!selectedChat) return;
        try {
            const targetId = userId ? parseInt(userId) : null;
            await api.patch(`/chats/assign`, {
                whatsappId: selectedChat.whatsapp_id,
                userId: targetId
            });
            setChats(chats.map(c => c.whatsapp_id === selectedChat.whatsapp_id ? { ...c, assigned_user_id: targetId } : c));
            setSelectedChat({ ...selectedChat, assigned_user_id: targetId });
        } catch (err) {
            console.error("Failed to assign chat", err);
        }
    };

    const fetchChats = async () => {
        try {
            const res = await api.get('/chats');
            const data = res.data;
            setChats(data);
            setLoading(false);

            // If selectedChat is no longer in the list (unassigned), close view
            if (selectedChat && !data.find(c => c.whatsapp_id === selectedChat.whatsapp_id)) {
                setSelectedChat(null);
                setMessages([]);
            }
        } catch (err) {
            console.error(err);
            if (err.response && err.response.status === 403) router.push('/');
        }
    };

    const fetchMessages = async (chatId) => {
        try {
            const res = await api.get(`/messages/${chatId}`);
            setMessages(res.data);
        } catch (err) {
            console.error(err);
            if (err.response && err.response.status === 403) {
                // If unassigned while viewing, close the chat
                alert("Este chat ya no está asignado a tu usuario.");
                setSelectedChat(null);
                setMessages([]);
                fetchChats(); // Refresh list
            }
        }
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedChat) return;

        try {
            // For text only, we can still use JSON or FormData. 
            // Let's use FormData to be consistent if we want, or separate endpoints.
            // Backend handles multer single('file'), so if no file, it works?
            // Multer is middleware. If sending JSON, multer might skip? 
            // Better to use FormData for everything or check content-type.
            // Backend `upload.single('file')` processes form-data. 
            // If we send JSON, body might be empty if multer expects form-data.
            // Let's rely on FormData for consistency in this function if we were mixing.
            // But for simple text, existing JSON api.post works if backend handles it.
            // My backend code: `upload.single` is first. It parses form-data.
            // If content-type is json, it might pass through but `req.body` needs parsing.
            // express.json() is BEFORE route. So JSON works? Yes.

            await api.post('/messages', {
                chatId: selectedChat.whatsapp_id,
                content: newMessage
            });
            setNewMessage('');
            fetchMessages(selectedChat.whatsapp_id);
        } catch (err) {
            console.error(err);
            if (err.response && err.response.status === 403) {
                alert("No puedes enviar mensajes: este chat ya no está asignado a tu usuario.");
                setSelectedChat(null);
                setMessages([]);
                fetchChats();
            } else {
                alert("Error al enviar mensaje");
            }
        }
    };

    const sendFile = async (file) => {
        if (!selectedChat || uploading) return;
        setUploading(true);

        const formData = new FormData();
        formData.append('chatId', selectedChat.whatsapp_id);
        formData.append('file', file);
        // User might want caption? For now just send file.

        try {
            await api.post('/messages', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            fetchMessages(selectedChat.whatsapp_id);
        } catch (err) {
            console.error(err);
            if (err.response && err.response.status === 403) {
                alert("No puedes enviar archivos: este chat ya no está asignado a tu usuario.");
                setSelectedChat(null);
                setMessages([]);
                fetchChats();
            } else {
                alert("Error al enviar archivo");
            }
        } finally {
            setUploading(false);
        }
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            sendFile(e.target.files[0]);
        }
    };

    const toggleAI = async (e) => {
        e.stopPropagation();
        if (!selectedChat) return;
        try {
            const newVal = !selectedChat.ai_enabled;
            await api.patch(`/chats/${selectedChat.whatsapp_id}/ai`, { enabled: newVal });
            setChats(chats.map(c => c.whatsapp_id === selectedChat.whatsapp_id ? { ...c, ai_enabled: newVal } : c));
            setSelectedChat({ ...selectedChat, ai_enabled: newVal });
        } catch (err) {
            console.error("Failed to toggle AI");
        }
    };

    if (loading) return <div>Loading...</div>;

    const renderMessageContent = (msg) => {
        if (msg.media_type === 'image') {
            return (
                <div>
                    {/* Use full URL from backend (proxy/virtual host handles it?) 
                         In backend we saved `/uploads/filename`.
                         Frontend API base is `https://wachatapi.1bit.ar`.
                         So we prepend that.
                     */}
                    <img
                        src={`${process.env.NEXT_PUBLIC_API_URL}${msg.media_url}`}
                        alt="Media"
                        style={{ maxWidth: '250px', borderRadius: '8px', cursor: 'pointer' }}
                        onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL}${msg.media_url}`, '_blank')}
                    />
                    {msg.content && <div style={{ marginTop: '5px' }}>{msg.content}</div>}
                </div>
            );
        } else if (msg.media_type === 'audio') {
            return (
                <audio controls src={`${process.env.NEXT_PUBLIC_API_URL}${msg.media_url}`} />
            );
        } else if (msg.media_type === 'document') {
            return (
                <a href={`${process.env.NEXT_PUBLIC_API_URL}${msg.media_url}`} target="_blank" rel="noreferrer" style={{ color: 'white', textDecoration: 'underline' }}>
                    📄 Document
                </a>
            );
        }
        return msg.content;
    };

    return (
        <div className="chat-layout">
            {/* Sidebar */}
            <div className="sidebar">
                <div className="sidebar-header" style={{
                    background: 'var(--primary-color)',
                    color: 'white'
                }}>
                    <h2>1Bit Chats</h2>
                    <div style={{ display: 'flex', gap: '5px' }}>
                        {typeof window !== 'undefined' && localStorage.getItem('role') === 'admin' && (
                            <button onClick={() => router.push('/admin')} style={{
                                background: 'rgba(255,255,255,0.2)',
                                border: 'none',
                                color: 'white',
                                padding: '5px 10px',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}>⚙️ Admin</button>
                        )}
                        <button onClick={() => { localStorage.clear(); router.push('/'); }} style={{
                            background: 'rgba(255,255,255,0.2)',
                            border: 'none',
                            color: 'white',
                            padding: '5px 10px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}>Logout</button>
                    </div>
                </div>
                <div className="chat-list">
                    {chats.map(chat => (
                        <div
                            key={chat.whatsapp_id}
                            className={`chat-item ${selectedChat?.whatsapp_id === chat.whatsapp_id ? 'active' : ''}`}
                            onClick={() => setSelectedChat(chat)}
                            style={selectedChat?.whatsapp_id === chat.whatsapp_id ? {
                                borderLeft: '4px solid var(--secondary-color)',
                                background: '#f8f9fa'
                            } : {}}
                        >
                            <div style={{ flex: 1 }}>
                                <div className="chat-item-name">{chat.name || chat.whatsapp_id}</div>
                                <div style={{ fontSize: '12px', color: '#888' }}>
                                    {chat.ai_enabled ? '🤖 AI Active' : '👤 Manual'}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Window */}
            {selectedChat ? (
                <div className="chat-window">
                    <div className="chat-header">
                        <h3>{selectedChat.name || selectedChat.whatsapp_id}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            {typeof window !== 'undefined' && localStorage.getItem('role') === 'admin' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <span style={{ fontSize: '12px' }}>Assign:</span>
                                    <select
                                        value={selectedChat.assigned_user_id || ''}
                                        onChange={(e) => assignChat(e.target.value)}
                                        style={{ padding: '4px', borderRadius: '4px', border: '1px solid #ddd' }}
                                    >
                                        <option value="">None</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.username}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <label style={{ cursor: 'pointer', fontSize: '14px' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedChat.ai_enabled}
                                    onChange={toggleAI}
                                /> AI Enabled
                            </label>
                        </div>
                    </div>

                    <div className="messages-container">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`message ${msg.user_id ? 'sent' : 'received'}`}>
                                <div className="message-sender">{msg.sender_name || 'Client'}</div>
                                <div>{renderMessageContent(msg)}</div>
                                <div className="message-meta">{new Date(msg.timestamp).toLocaleTimeString()}</div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="input-area">
                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            onChange={handleFileSelect}
                        />
                        <button
                            type="button"
                            style={{ marginRight: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}
                            onClick={() => fileInputRef.current.click()}
                            title="Attach File"
                        >
                            📎
                        </button>
                        <form style={{ display: 'flex', flex: 1 }} onSubmit={sendMessage}>
                            <input
                                type="text"
                                placeholder="Type a message or paste an image..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                            />
                            <button type="submit" className="send-btn">➤</button>
                        </form>
                    </div>
                </div>
            ) : (
                <div className="chat-window" style={{ justifyContent: 'center', alignItems: 'center', background: '#f0f2f5' }}>
                    <h3>Select a chat to start messaging</h3>
                </div>
            )}
        </div>
    );
}
