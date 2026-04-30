import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { stakeholdersClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: 'guide' | 'tourist' | 'administrator';
  is_blocked: boolean;
}

const roleLabel: Record<string, string> = {
  guide: 'Vodič',
  tourist: 'Turista',
  administrator: 'Administrator',
};

const roleColor: Record<string, string> = {
  guide: '#2980b9',
  tourist: '#27ae60',
  administrator: '#8e44ad',
};

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    if (user?.role !== 'administrator') {
      navigate('/');
      return;
    }
    fetchUsers();
  }, [user, navigate]);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await stakeholdersClient.get('/api/users');
      setUsers(res.data);
    } catch {
      setError('Greška pri učitavanju korisnika.');
    } finally {
      setLoading(false);
    }
  }

  async function toggleBlock(u: AdminUser) {
    setActionLoading(u.id);
    try {
      const endpoint = u.is_blocked
        ? `/api/users/${u.id}/unblock`
        : `/api/users/${u.id}/block`;
      const res = await stakeholdersClient.patch(endpoint);
      setUsers(prev =>
        prev.map(existing =>
          existing.id === u.id ? { ...existing, is_blocked: res.data.is_blocked } : existing
        )
      );
    } catch {
      setError('Akcija nije uspela. Pokušaj ponovo.');
    } finally {
      setActionLoading(null);
    }
  }

  const nonAdmins = users.filter(u => u.role !== 'administrator');
  const admins = users.filter(u => u.role === 'administrator');
  const blocked = nonAdmins.filter(u => u.is_blocked).length;
  const active = nonAdmins.filter(u => !u.is_blocked).length;

  if (loading) return <p style={{ color: '#666', padding: 20 }}>Učitavanje...</p>;

  return (
    <div style={{ maxWidth: 900 }}>
      <h1 className="page-title">Upravljanje korisnicima</h1>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Ukupno korisnika', value: nonAdmins.length, color: '#1a1a2e' },
          { label: 'Aktivnih', value: active, color: '#27ae60' },
          { label: 'Blokiranih', value: blocked, color: '#dc3545' },
        ].map(stat => (
          <div key={stat.label} className="card" style={{ flex: 1, textAlign: 'center', padding: '16px 12px' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {error && (
        <div style={{
          background: '#fff3f3', border: '1px solid #f5c2c2', borderRadius: 6,
          padding: '10px 14px', marginBottom: 16, color: '#c0392b', fontSize: 14
        }}>
          {error}
          <button onClick={() => setError('')} style={{
            background: 'none', border: 'none', cursor: 'pointer', float: 'right',
            color: '#c0392b', fontWeight: 700
          }}>×</button>
        </div>
      )}

      <div className="card">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eee' }}>
              <th style={th}>ID</th>
              <th style={th}>Korisničko ime</th>
              <th style={th}>Email</th>
              <th style={th}>Uloga</th>
              <th style={th}>Status</th>
              <th style={{ ...th, textAlign: 'right' }}>Akcija</th>
            </tr>
          </thead>
          <tbody>
            {/* Admins first (read-only) */}
            {admins.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid #f5f5f5', opacity: 0.7 }}>
                <td style={td}><span style={idBadge}>#{u.id}</span></td>
                <td style={{ ...td, fontWeight: 500 }}>{u.username}</td>
                <td style={{ ...td, color: '#666' }}>{u.email}</td>
                <td style={td}>
                  <span style={{ ...roleBadge, background: roleColor[u.role] + '18', color: roleColor[u.role] }}>
                    {roleLabel[u.role]}
                  </span>
                </td>
                <td style={td}>
                  <span style={{ ...statusBadge, background: '#f0f0f0', color: '#999' }}>
                    Zaštićen
                  </span>
                </td>
                <td style={{ ...td, textAlign: 'right' }}>
                  <span style={{ fontSize: 12, color: '#bbb' }}>—</span>
                </td>
              </tr>
            ))}

            {/* Regular users */}
            {nonAdmins.map(u => (
              <tr
                key={u.id}
                style={{
                  borderBottom: '1px solid #f5f5f5',
                  background: u.is_blocked ? '#fff8f8' : 'transparent',
                  opacity: actionLoading === u.id ? 0.5 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                <td style={td}><span style={idBadge}>#{u.id}</span></td>
                <td style={{ ...td, fontWeight: 500 }}>{u.username}</td>
                <td style={{ ...td, color: '#666' }}>{u.email}</td>
                <td style={td}>
                  <span style={{ ...roleBadge, background: roleColor[u.role] + '18', color: roleColor[u.role] }}>
                    {roleLabel[u.role]}
                  </span>
                </td>
                <td style={td}>
                  {u.is_blocked ? (
                    <span style={{ ...statusBadge, background: '#feecec', color: '#dc3545' }}>
                      Blokiran
                    </span>
                  ) : (
                    <span style={{ ...statusBadge, background: '#edfaf1', color: '#27ae60' }}>
                      Aktivan
                    </span>
                  )}
                </td>
                <td style={{ ...td, textAlign: 'right' }}>
                  <button
                    onClick={() => toggleBlock(u)}
                    disabled={actionLoading === u.id}
                    style={{
                      padding: '5px 14px',
                      fontSize: 13,
                      borderRadius: 5,
                      cursor: actionLoading === u.id ? 'not-allowed' : 'pointer',
                      border: 'none',
                      fontFamily: 'inherit',
                      background: u.is_blocked ? '#1a1a2e' : '#dc3545',
                      color: 'white',
                    }}
                  >
                    {actionLoading === u.id
                      ? '...'
                      : u.is_blocked
                      ? 'Odblokiraj'
                      : 'Blokiraj'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {nonAdmins.length === 0 && !loading && (
          <p style={{ textAlign: 'center', color: '#aaa', padding: 20, fontSize: 14 }}>
            Nema registrovanih korisnika.
          </p>
        )}
      </div>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  color: '#888',
  fontWeight: 500,
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const td: React.CSSProperties = {
  padding: '11px 12px',
  verticalAlign: 'middle',
};

const idBadge: React.CSSProperties = {
  fontSize: 12,
  color: '#aaa',
  fontFamily: 'monospace',
};

const roleBadge: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 10px',
  borderRadius: 12,
  fontSize: 12,
  fontWeight: 500,
};

const statusBadge: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 10px',
  borderRadius: 12,
  fontSize: 12,
  fontWeight: 500,
};