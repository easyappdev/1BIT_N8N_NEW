'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../lib/api';

export default function AdminPage() {
    const [users, setUsers] = useState([]);
    const [formData, setFormData] = useState({ username: '', password: '', role: 'operator' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const router = useRouter();

    useEffect(() => {
        const role = localStorage.getItem('role');
        if (role !== 'admin') {
            router.push('/chat');
            return;
        }
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await api.get('/users');
            setUsers(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this user?')) return;
        try {
            await api.delete(`/users/${id}`);
            fetchUsers();
        } catch (err) {
            alert('Failed to delete user');
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            await api.post('/users', formData);
            setSuccess('User created!');
            setFormData({ username: '', password: '', role: 'operator' });
            fetchUsers();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create user');
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1>Admin Panel</h1>
                <button onClick={() => router.push('/chat')} style={btnStyle}>Back to Chat</button>
            </div>

            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
                <h2>Create User</h2>
                <form onSubmit={handleCreate} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div>
                        <label>Username</label><br />
                        <input
                            type="text"
                            value={formData.username}
                            onChange={e => setFormData({ ...formData, username: e.target.value })}
                            required
                            style={inputStyle}
                        />
                    </div>
                    <div>
                        <label>Password</label><br />
                        <input
                            type="text"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                            required
                            style={inputStyle}
                        />
                    </div>
                    <div>
                        <label>Role</label><br />
                        <select
                            value={formData.role}
                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                            style={inputStyle}
                        >
                            <option value="operator">Operator</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <button type="submit" style={{ ...btnStyle, background: 'var(--primary-color)', color: 'white' }}>Create</button>
                </form>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                {success && <p style={{ color: 'green' }}>{success}</p>}
            </div>

            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <h2>Existing Users</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
                            <th style={thStyle}>ID</th>
                            <th style={thStyle}>Username</th>
                            <th style={thStyle}>Role</th>
                            <th style={thStyle}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={tdStyle}>{user.id}</td>
                                <td style={tdStyle}>{user.username}</td>
                                <td style={tdStyle}>
                                    <span style={{
                                        padding: '4px 8px',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        background: user.role === 'admin' ? '#e3f2fd' : '#f3e5f5',
                                        color: user.role === 'admin' ? '#1976d2' : '#7b1fa2'
                                    }}>
                                        {user.role}
                                    </span>
                                </td>
                                <td style={tdStyle}>
                                    <button
                                        onClick={() => handleDelete(user.id)}
                                        style={{ ...btnStyle, background: '#fee2e2', color: '#dc2626' }}
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const inputStyle = { padding: '8px', border: '1px solid #ddd', borderRadius: '4px', minWidth: '150px' };
const btnStyle = { padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: '#ddd' };
const thStyle = { padding: '12px', borderBottom: '2px solid #ddd' };
const tdStyle = { padding: '12px' };
