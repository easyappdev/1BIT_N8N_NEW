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
    const [showContactModal, setShowContactModal] = useState(false);
    const [contacts, setContacts] = useState([]);
    const [contactSearch, setContactSearch] = useState('');
    const [contactError, setContactError] = useState(null);
    const [historyLimit, setHistoryLimit] = useState(5);
    const [selectedImage, setSelectedImage] = useState(null);
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
        if (messages.length > 0) {
            const timer = setTimeout(() => {
                if (messagesEndRef.current) {
                    messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
                }
            }, 150); // Slightly longer delay to ensure DOM stability
            return () => clearTimeout(timer);
        }
    }, [messages, selectedChat]);

    const fetchUsers = async () => {
        try {
            const res = await api.get('/users');
            setUsers(res.data);
        } catch (err) {
            console.error("Error fetching users", err);
        }
    };

    const fetchContacts = async () => {
        setContactError(null);
        try {
            const res = await api.get('/contacts');
            setContacts(Array.isArray(res.data) ? res.data : []);
            if (!Array.isArray(res.data)) {
                setContactError("La API no devolvió una lista de contactos válida.");
            }
        } catch (err) {
            console.error("Error fetching contacts", err);
            const msg = err.response?.data?.error || err.message;
            const debug = err.response?.data?.debug ? JSON.stringify(err.response.data.debug) : '';
            setContactError(`${msg} ${debug}`);
        }
    };

    const startChat = async (contact) => {
        try {
            const res = await api.post('/chats', {
                whatsappId: contact.id, // Evolution API contact ID is usually the JID/Number
                contactName: contact.name || contact.pushname || contact.id
            });
            const newChat = res.data;

            // Add to list if not already there (idempotency handled by backend too)
            if (!chats.find(c => c.whatsapp_id === newChat.whatsapp_id)) {
                setChats([newChat, ...chats]);
            }

            setSelectedChat(newChat);
            setShowContactModal(false);
        } catch (err) {
            console.error("Failed to start chat", err);
            alert("Error al iniciar el chat");
        }
    };

    const assignChat = async (userId) => {
        if (!selectedChat) return;
        try {
            const targetId = userId ? parseInt(userId) : null;
            await api.patch(`/chats/assign`, {
                whatsappId: selectedChat.whatsapp_id,
                userId: targetId,
                historyLimit: historyLimit
            });
            setChats(chats.map(c => c.whatsapp_id === selectedChat.whatsapp_id ? { ...c, assigned_user_id: targetId } : c));
            setSelectedChat({ ...selectedChat, assigned_user_id: targetId });
            alert("Chat asignado con éxito");
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

    const handleOpenDocument = (dataUrl, customFileName = 'documento.pdf') => {
        if (!dataUrl) return;

        // Ensure we have a Data URI or HTTP URL
        const isDataUri = dataUrl.startsWith('data:');
        const isHttp = dataUrl.startsWith('http');

        if (isHttp) {
            window.open(dataUrl, '_blank');
            return;
        }

        try {
            // If it's raw Base64 or Data URI, convert to Blob
            let base64Content = dataUrl;
            let mimeType = 'application/octet-stream';

            if (isDataUri) {
                const parts = dataUrl.split(',');
                if (parts.length > 1) {
                    const mimeMatch = parts[0].match(/:(.*?);/);
                    mimeType = mimeMatch ? mimeMatch[1] : mimeType;
                    base64Content = parts[1];
                }
            } else {
                // Assume raw Base64 if it's not a URL
                base64Content = dataUrl;
                // Simple check for PDF header in base64
                if (base64Content.startsWith('JVBER')) mimeType = 'application/pdf';
            }

            const bstr = atob(base64Content);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }

            const blob = new Blob([u8arr], { type: mimeType });
            const blobUrl = URL.createObjectURL(blob);

            // SENIOR WAY: Use an anchor tag to trigger a named download or open
            const link = document.createElement('a');
            link.href = blobUrl;
            link.target = '_blank';
            // If we have a filename, suggest it for download
            if (customFileName) {
                link.download = customFileName;
            }

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Cleanup
            setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        } catch (e) {
            console.error("Error Processing Document Data:", e);
            // Absolute fallback
            window.open(dataUrl, '_blank');
        }
    };

    const renderMessageContent = (msg) => {
        const getFullUrl = (url) => {
            if (!url) return '';
            const trimmed = url.trim();
            // 1. Si ya es una URL completa (HTTP o DATA), no tocarla
            if (trimmed.startsWith('http') || trimmed.startsWith('data:')) return trimmed;

            // 2. Heurística Senior: Si es muy largo y no empieza con '/' (ruta local), es Base64 puro.
            // NOTA: Base64 PUEDE contener caracteres '/' y '+', por eso quitamos la restricción errónea anterior.
            if (trimmed.length > 100 && !trimmed.startsWith('/')) {
                return trimmed;
            }

            // 3. De lo contrario, es una ruta de archivo relativa en nuestro servidor
            return `${process.env.NEXT_PUBLIC_API_URL}${url}`;
        };

        const mediaUrl = getFullUrl(msg.media_url);

        // RE-INSERTADO PARA DIAGNÓSTICO
        if (msg.media_url) console.log(`DIAGNOSTICO: Msg ${msg.id} | Tipo: ${msg.media_type} | URL empieza con: ${mediaUrl.substring(0, 60)}... | Longitud: ${msg.media_url.length}`);
        else if (msg.media_type && msg.media_type !== 'chat') console.warn(`ALERTA: Msg ${msg.id} es multimedia (${msg.media_type}) pero la URL está VACÍA.`);

        if (msg.media_type === 'image') {
            return (
                <div>
                    <img
                        src={mediaUrl}
                        alt="Media"
                        style={{ maxWidth: '250px', borderRadius: '8px', cursor: 'pointer' }}
                        onClick={() => setSelectedImage(mediaUrl)}
                    />
                    {msg.content && <div style={{ marginTop: '5px' }}>{msg.content}</div>}
                </div>
            );
        } else if (msg.media_type === 'audio') {
            return (
                <audio controls src={mediaUrl} />
            );
        } else if (msg.media_type === 'video') {
            return (
                <video controls style={{ maxWidth: '250px', borderRadius: '8px' }}>
                    <source src={mediaUrl} type="video/mp4" />
                    Your browser does not support the video tag.
                </video>
            );
        } else if (msg.media_type === 'document') {
            return (
                <div
                    onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDocument(mediaUrl, msg.content || 'archivo.pdf');
                    }}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: '5px',
                        cursor: 'pointer',
                        padding: '10px',
                        background: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        maxWidth: '220px',
                        position: 'relative'
                    }}
                >
                    {/* Render Image only if valid length, otherwise fallback */}
                    {msg.thumbnail && msg.thumbnail.length > 50 ? (
                        <img
                            src={`data:image/jpeg;base64,${msg.thumbnail}`}
                            alt=""
                            style={{ width: '100%', height: 'auto', borderRadius: '4px', objectFit: 'cover', display: 'block' }}
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block'; // Show fallback
                            }}
                        />
                    ) : null}

                    {/* Fallback Icon: Shown by default if no thumbnail, or if thumbnail errors (via onError above) */}
                    <div style={{ fontSize: '32px', display: (msg.thumbnail && msg.thumbnail.length > 50) ? 'none' : 'block' }}>📄</div>

                    <div style={{
                        color: '#333',
                        textDecoration: 'none',
                        wordBreak: 'break-word',
                        fontSize: '13px',
                        fontWeight: '600',
                        lineHeight: '1.3'
                    }}>
                        {msg.content || 'Ver Documento'}
                    </div>
                </div>
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
                            <>
                                <button onClick={() => { setShowContactModal(true); fetchContacts(); }} style={{
                                    background: 'var(--secondary-color)',
                                    border: 'none',
                                    color: 'white',
                                    padding: '5px 10px',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}>+ Nuevo</button>
                                <button onClick={() => router.push('/admin')} style={{
                                    background: 'rgba(255,255,255,0.2)',
                                    border: 'none',
                                    color: 'white',
                                    padding: '5px 10px',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}>⚙️</button>
                            </>
                        )}
                        <button onClick={() => { localStorage.clear(); router.push('/'); }} style={{
                            background: 'rgba(255,255,255,0.2)',
                            border: 'none',
                            color: 'white',
                            padding: '5px 10px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}>Salir</button>
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
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <span style={{ fontSize: '12px' }}>Historial:</span>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={historyLimit}
                                            onChange={(e) => setHistoryLimit(e.target.value)}
                                            style={{ width: '45px', padding: '4px', borderRadius: '4px', border: '1px solid #ddd' }}
                                            title="Cantidad de mensajes previos visibles para el operador"
                                        />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <span style={{ fontSize: '12px' }}>Asignar:</span>
                                        <select
                                            value={selectedChat.assigned_user_id || ''}
                                            onChange={(e) => assignChat(e.target.value)}
                                            style={{ padding: '4px', borderRadius: '4px', border: '1px solid #ddd' }}
                                        >
                                            <option value="">Ninguno</option>
                                            {users.map(u => (
                                                <option key={u.id} value={u.id}>{u.username}</option>
                                            ))}
                                        </select>
                                    </div>
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
                                <div className="message-meta" style={{ color: '#ccc', fontSize: '11px', textAlign: 'right', marginTop: '4px' }}>
                                    {(() => {
                                        const ts = Number(msg.timestamp);
                                        const date = new Date(ts > 1000000000000 ? ts : ts * 1000);
                                        return isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                    })()}
                                </div>
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
            {/* Contact Discovery Modal */}
            {showContactModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{
                        background: 'white', padding: '20px', borderRadius: '8px',
                        width: '400px', maxHeight: '80vh', display: 'flex', flexDirection: 'column'
                    }}>
                        <h3>Iniciar nuevo chat</h3>

                        {contactError && (
                            <div style={{ color: 'red', background: '#ffebee', padding: '10px', borderRadius: '4px', fontSize: '12px', marginBottom: '10px' }}>
                                ⚠️ {contactError}
                            </div>
                        )}

                        <input
                            type="text"
                            placeholder="Buscar contacto..."
                            value={contactSearch}
                            onChange={(e) => setContactSearch(e.target.value)}
                            style={{ width: '100%', padding: '8px', margin: '10px 0', borderRadius: '4px', border: '1px solid #ddd' }}
                        />
                        <div style={{ overflowY: 'auto', flex: 1 }}>
                            {contacts
                                .filter(c =>
                                    (c.name && c.name.toLowerCase().includes(contactSearch.toLowerCase())) ||
                                    (c.id && c.id.includes(contactSearch))
                                )
                                .slice(0, 50)
                                .map(contact => (
                                    <div
                                        key={contact.id}
                                        onClick={() => startChat(contact)}
                                        style={{
                                            padding: '10px', borderBottom: '1px solid #eee',
                                            cursor: 'pointer', hover: { background: '#f0f2f5' }
                                        }}
                                        onMouseEnter={(e) => e.target.style.background = '#f0f2f5'}
                                        onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                    >
                                        <div style={{ fontWeight: 'bold' }}>{contact.name || contact.pushname || 'Sin nombre'}</div>
                                        <div style={{ fontSize: '12px', color: '#888' }}>{contact.id}</div>
                                    </div>
                                ))
                            }
                        </div>
                        <button
                            onClick={() => setShowContactModal(false)}
                            style={{ marginTop: '10px', padding: '8px', cursor: 'pointer', borderRadius: '4px', border: 'none', background: '#ccc' }}
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )}

            {/* Image Lightbox */}
            {selectedImage && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.85)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 2000,
                    cursor: 'pointer'
                }} onClick={() => setSelectedImage(null)}>
                    <img
                        src={selectedImage}
                        alt="Full size"
                        style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
                    />
                    <button style={{
                        position: 'absolute', top: '20px', right: '20px',
                        background: 'rgba(255,255,255,0.2)', color: 'white',
                        border: 'none', borderRadius: '50%', width: '40px', height: '40px',
                        fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>✕</button>
                </div>
            )}
        </div>
    );
}
