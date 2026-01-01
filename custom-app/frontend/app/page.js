'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from './lib/api';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/auth/login', { username, password });
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('role', response.data.role);
            localStorage.setItem('username', response.data.username);
            router.push('/chat');
        } catch (err) {
            setError('Invalid username or password');
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <h1 style={{ color: 'var(--primary-color)' }}>1Bit Manager</h1>
                <form onSubmit={handleLogin}>
                    <div className="form-group">
                        <label>Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    {error && <p style={{ color: 'red', marginBottom: '10px' }}>{error}</p>}
                    <button type="submit" className="btn-primary" style={{
                        background: 'var(--primary-color)',
                        fontWeight: 'bold'
                    }}>Login</button>
                </form>
            </div>
        </div>
    );
}
