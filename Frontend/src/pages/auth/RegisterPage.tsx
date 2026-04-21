import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { stakeholdersClient } from '../../api/client';

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'tourist' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await stakeholdersClient.post('/api/auth/register', form);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '60px auto' }}>
      <div className="card">
        <h2 style={{ marginBottom: 20 }}>Register</h2>
        {success ? (
          <p style={{ color: 'green' }}>Registered successfully! Redirecting...</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username</label>
              <input name="username" value={form.username} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input name="password" type="password" value={form.password} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select name="role" value={form.role} onChange={handleChange}>
                <option value="tourist">Tourist</option>
                <option value="guide">Guide</option>
              </select>
            </div>
            {error && <p className="error" style={{ marginBottom: 12 }}>{error}</p>}
            <button className="btn-primary" type="submit" style={{ width: '100%' }}>Register</button>
          </form>
        )}
        <p style={{ marginTop: 16, fontSize: 14, textAlign: 'center' }}>
          Have an account? <Link to="/login" style={{ color: '#1a1a2e' }}>Login</Link>
        </p>
      </div>
    </div>
  );
}
