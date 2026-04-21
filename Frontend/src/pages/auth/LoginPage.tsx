import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { stakeholdersClient, saveToken } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const res = await stakeholdersClient.post('/api/auth/login', { username, password });
      const { token, user } = res.data;
      saveToken(token);
      login(user, token);
      navigate('/blogs');
    } catch {
      setError('Invalid username or password');
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '60px auto' }}>
      <div className="card">
        <h2 style={{ marginBottom: 20 }}>Login</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <p className="error" style={{ marginBottom: 12 }}>{error}</p>}
          <button className="btn-primary" type="submit" style={{ width: '100%' }}>Login</button>
        </form>
        <p style={{ marginTop: 16, fontSize: 14, textAlign: 'center' }}>
          No account? <Link to="/register" style={{ color: '#1a1a2e' }}>Register</Link>
        </p>
      </div>
    </div>
  );
}
