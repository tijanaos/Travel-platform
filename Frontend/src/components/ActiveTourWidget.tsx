import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toursClient } from '../api/client';
import { useTourExecution } from '../context/TourExecutionContext';
import { useAuth } from '../context/AuthContext';

export default function ActiveTourWidget() {
  const { user } = useAuth();
  const { execution, tour, keyPoints, notification, setExecution } = useTourExecution();
  const [minimized, setMinimized] = useState(false);
  const [actionError, setActionError] = useState('');
  const navigate = useNavigate();

  if (!user || user.role !== 'tourist' || !execution || execution.status !== 'ACTIVE') {
    return null;
  }

  const completed = execution.completedKeyPoints.length;
  const total = keyPoints.length;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  async function handleAbandon() {
    if (!execution) return;
    try {
      const res = await toursClient.post(`/api/executions/${execution.id}/abandon`);
      setExecution(res.data);
      setActionError('');
    } catch (err: any) {
      setActionError(err.response?.data || 'Failed to abandon');
    }
  }

  async function handleComplete() {
    if (!execution) return;
    try {
      const res = await toursClient.post(`/api/executions/${execution.id}/complete`);
      setExecution(res.data);
      setActionError('');
    } catch (err: any) {
      setActionError(err.response?.data || 'Failed to complete');
    }
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      left: 20,
      zIndex: 9999,
      width: minimized ? 220 : 300,
      background: '#1a1a2e',
      color: '#fff',
      borderRadius: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
      overflow: 'hidden',
      transition: 'width 0.2s ease',
      fontFamily: 'inherit',
    }}>
      {/* Header bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        background: '#16213e',
        cursor: 'pointer',
        userSelect: 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 14 }}>🗺️</span>
          <span style={{
            fontSize: 13, fontWeight: 600,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            maxWidth: minimized ? 120 : 180,
          }}>
            {tour?.name ?? 'Active Tour'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button
            onClick={() => navigate(`/executions/${execution.id}`)}
            title="Open full view"
            style={iconBtnStyle}
          >⤢</button>
          <button
            onClick={() => setMinimized(m => !m)}
            title={minimized ? 'Expand' : 'Minimize'}
            style={iconBtnStyle}
          >{minimized ? '▲' : '▼'}</button>
        </div>
      </div>

      {/* Progress bar always visible */}
      <div style={{ height: 4, background: '#0f3460' }}>
        <div style={{
          height: '100%',
          width: `${progressPct}%`,
          background: '#e94560',
          transition: 'width 0.4s ease',
        }} />
      </div>

      {/* Body — hidden when minimized */}
      {!minimized && (
        <div style={{ padding: '12px 14px' }}>
          {/* Notification */}
          {notification && (
            <div style={{
              background: '#1b5e20', color: '#a5d6a7',
              borderRadius: 6, padding: '6px 10px',
              fontSize: 12, marginBottom: 10,
            }}>
              {notification}
            </div>
          )}

          {/* Progress text */}
          <div style={{ fontSize: 13, marginBottom: 10, color: '#ccc' }}>
            Key points: <strong style={{ color: '#fff' }}>{completed} / {total}</strong>
            <span style={{ float: 'right', color: '#e94560', fontWeight: 600 }}>{progressPct}%</span>
          </div>

          {/* Key point list */}
          <div style={{ maxHeight: 130, overflowY: 'auto', marginBottom: 12 }}>
            {keyPoints.map((kp, i) => {
              const done = execution.completedKeyPoints.some(c => c.keyPointId === kp.id);
              return (
                <div key={kp.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '4px 0',
                  borderBottom: '1px solid #0f3460',
                  fontSize: 12,
                  color: done ? '#a5d6a7' : '#aaa',
                }}>
                  <span>{done ? '✅' : '⭕'}</span>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {i + 1}. {kp.name}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Simulator hint */}
          <p style={{ fontSize: 11, color: '#888', marginBottom: 10 }}>
            Proximity checked every 10s.{' '}
            <span
              onClick={() => navigate('/simulator')}
              style={{ color: '#e94560', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Update position
            </span>
          </p>

          {/* Action error */}
          {actionError && (
            <p style={{ color: '#ef9a9a', fontSize: 12, marginBottom: 8 }}>{actionError}</p>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleComplete} style={completeBtnStyle}>
              ✓ Complete
            </button>
            <button onClick={handleAbandon} style={abandonBtnStyle}>
              ✕ Abandon
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#aaa',
  cursor: 'pointer',
  fontSize: 14,
  padding: '0 4px',
  lineHeight: 1,
};

const completeBtnStyle: React.CSSProperties = {
  flex: 1,
  background: '#1b5e20',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '7px 0',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
};

const abandonBtnStyle: React.CSSProperties = {
  flex: 1,
  background: '#b71c1c',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '7px 0',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
};
