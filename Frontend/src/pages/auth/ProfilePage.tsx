import { useState, useEffect } from 'react';
import { stakeholdersClient } from '../../api/client';
import { Profile } from '../../types';
import { useAuth } from '../../context/AuthContext';

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', biography: '', motto: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    stakeholdersClient.get('/api/profile/me')
      .then(res => {
        setProfile(res.data);
        setForm({
          firstName: res.data.firstName || '',
          lastName: res.data.lastName || '',
          biography: res.data.biography || '',
          motto: res.data.motto || '',
        });
      })
      .catch(() => setError('Failed to load profile'));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const data = new FormData();
      data.append('firstName', form.firstName);
      data.append('lastName', form.lastName);
      data.append('biography', form.biography);
      data.append('motto', form.motto);
      if (imageFile) data.append('image', imageFile);

      const res = await stakeholdersClient.put('/api/profile/me', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProfile(res.data);
      setEditing(false);
      setSuccess('Profile updated!');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to update profile');
    }
  }

  if (!profile) return <p>Loading...</p>;

  return (
    <div style={{ maxWidth: 600 }}>
      <h1 className="page-title">My Profile</h1>
      <div className="card">
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 20 }}>
          {profile.profileImage && (
            <img src={`http://localhost:8080${profile.profileImage}`}
              alt="profile" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }} />
          )}
          <div>
            <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>{profile.firstName} {profile.lastName}</p>
            <p style={{ color: '#666', fontSize: 14 }}>@{user?.username} · {user?.role}</p>
          </div>
        </div>

        {!editing ? (
          <>
            <p style={{ marginBottom: 8 }}><strong>Biography:</strong> {profile.biography || '—'}</p>
            <p style={{ marginBottom: 16 }}><strong>Motto:</strong> {profile.motto || '—'}</p>
            <button className="btn-primary" onClick={() => setEditing(true)}>Edit Profile</button>
          </>
        ) : (
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>First Name</label>
                <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Last Name</label>
                <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label>Biography</label>
              <textarea rows={3} value={form.biography}
                onChange={e => setForm(f => ({ ...f, biography: e.target.value }))}
                style={{ resize: 'vertical' }} />
            </div>
            <div className="form-group">
              <label>Motto</label>
              <input value={form.motto} onChange={e => setForm(f => ({ ...f, motto: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Profile Image</label>
              <input type="file" accept="image/*" style={{ padding: 4 }}
                onChange={e => setImageFile(e.target.files?.[0] || null)} />
            </div>
            {error && <p className="error" style={{ marginBottom: 8 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" type="submit">Save</button>
              <button className="btn-secondary" type="button" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </form>
        )}
        {success && <p style={{ color: 'green', marginTop: 8 }}>{success}</p>}
      </div>
    </div>
  );
}
