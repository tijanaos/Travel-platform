import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { toursClient } from '../api/client';
import { useTourExecution } from '../context/TourExecutionContext';
import { useAuth } from '../context/AuthContext';

function ZoomControls() {
  const map = useMap();
  return (
    <div style={{
      position: 'absolute', top: 8, right: 8, zIndex: 1000,
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      {[{ label: '+', fn: () => map.zoomIn() }, { label: '−', fn: () => map.zoomOut() }].map(({ label, fn }) => (
        <button key={label} onClick={fn} style={{
          width: 28, height: 28, background: '#1a1a2e', color: '#fff',
          border: '1px solid #e94560', borderRadius: 6,
          fontSize: 16, lineHeight: 1, cursor: 'pointer', fontWeight: 700,
        }}>{label}</button>
      ))}
    </div>
  );
}

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const completedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

const currentPosIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

export default function ActiveTourWidget() {
  const { user } = useAuth();
  const { execution, tour, keyPoints, notification, setExecution } = useTourExecution();
  const [minimized, setMinimized] = useState(false);
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null);
  const [actionError, setActionError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!execution) return;
    toursClient.get('/api/tourist-position')
      .then(res => setCurrentPos({ lat: res.data.latitude, lng: res.data.longitude }))
      .catch(() => {});
  }, [execution?.id]);

  // Keep current position in sync with proximity checks
  useEffect(() => {
    if (!execution || execution.status !== 'ACTIVE') return;
    const id = setInterval(() => {
      toursClient.get('/api/tourist-position')
        .then(res => setCurrentPos({ lat: res.data.latitude, lng: res.data.longitude }))
        .catch(() => {});
    }, 10000);
    return () => clearInterval(id);
  }, [execution?.id, execution?.status]);

  if (!user || user.role !== 'tourist' || !execution || execution.status !== 'ACTIVE') {
    return null;
  }

  const completed = execution.completedKeyPoints.length;
  const total = keyPoints.length;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const allCompleted = total > 0 && completed === total;
  const completedKpIds = new Set(execution.completedKeyPoints.map(c => c.keyPointId));

  const mapCenter: [number, number] = currentPos
    ? [currentPos.lat, currentPos.lng]
    : keyPoints.length > 0
      ? [keyPoints[0].latitude, keyPoints[0].longitude]
      : [44.8176, 20.4569];

  async function handleAbandon() {
    try {
      const res = await toursClient.post(`/api/executions/${execution!.id}/abandon`);
      setExecution(res.data);
      setActionError('');
    } catch (err: any) {
      setActionError(err.response?.data || 'Failed to abandon');
    }
  }

  async function handleComplete() {
    try {
      const res = await toursClient.post(`/api/executions/${execution!.id}/complete`);
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
      width: minimized ? 240 : 380,
      background: '#1a1a2e',
      color: '#fff',
      borderRadius: 14,
      boxShadow: '0 8px 40px rgba(0,0,0,0.55)',
      overflow: 'hidden',
      transition: 'width 0.25s ease, height 0.25s ease',
      fontFamily: 'inherit',
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', background: '#16213e', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 15 }}>🗺️</span>
          <span style={{
            fontSize: 13, fontWeight: 600,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            maxWidth: minimized ? 130 : 230,
          }}>
            {tour?.name ?? 'Active Tour'}
          </span>
        </div>
        <button
          onClick={() => setMinimized(m => !m)}
          title={minimized ? 'Expand' : 'Minimize'}
          style={iconBtnStyle}
        >{minimized ? '▲' : '▼'}</button>
      </div>

      {/* ── Progress bar (always visible) ── */}
      <div style={{ height: 4, background: '#0f3460', flexShrink: 0 }}>
        <div style={{
          height: '100%', width: `${progressPct}%`,
          background: '#e94560', transition: 'width 0.4s ease',
        }} />
      </div>

      {/* ── Body (hidden when minimized) ── */}
      {!minimized && (
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>

          {/* Notification */}
          {notification && (
            <div style={{
              background: '#1b5e20', color: '#a5d6a7',
              padding: '7px 14px', fontSize: 12,
            }}>
              {notification}
            </div>
          )}

          {/* Map */}
          <div style={{ height: 220, flexShrink: 0 }}>
            <MapContainer center={mapCenter} zoom={14} style={{ height: '100%', width: '100%' }}
              zoomControl={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <ZoomControls />
              {keyPoints.length > 1 && (
                <Polyline
                  positions={keyPoints.map(kp => [kp.latitude, kp.longitude] as [number, number])}
                  color="#e94560" weight={3} dashArray="6,4"
                />
              )}
              {keyPoints.map((kp, i) => (
                <Marker key={kp.id} position={[kp.latitude, kp.longitude]}
                  icon={completedKpIds.has(kp.id) ? completedIcon : new L.Icon.Default()}>
                  <Popup>
                    <strong>{i + 1}. {kp.name}</strong><br />
                    {completedKpIds.has(kp.id) ? '✅ Completed' : '⭕ Not reached'}
                  </Popup>
                </Marker>
              ))}
              {currentPos && (
                <Marker position={[currentPos.lat, currentPos.lng]} icon={currentPosIcon}>
                  <Popup>📍 Your position</Popup>
                </Marker>
              )}
            </MapContainer>
          </div>

          {/* Inner panel */}
          <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Progress text */}
            <div style={{ fontSize: 13, color: '#ccc', display: 'flex', justifyContent: 'space-between' }}>
              <span>Key points: <strong style={{ color: '#fff' }}>{completed}/{total}</strong></span>
              <span style={{ color: '#e94560', fontWeight: 600 }}>{progressPct}%</span>
            </div>

            {/* Key point list */}
            <div style={{ maxHeight: 130, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {keyPoints.map((kp, i) => {
                const done = completedKpIds.has(kp.id);
                const ckp = execution.completedKeyPoints.find(c => c.keyPointId === kp.id);
                return (
                  <div key={kp.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    padding: '5px 8px', borderRadius: 6,
                    background: done ? '#1b3a1f' : '#0f1a2e',
                    fontSize: 12,
                  }}>
                    <span style={{ flexShrink: 0 }}>{done ? '✅' : '⭕'}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        color: done ? '#a5d6a7' : '#aaa',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {i + 1}. {kp.name}
                      </div>
                      {done && ckp && (
                        <div style={{ color: '#666', fontSize: 11 }}>
                          {new Date(ckp.completedAt).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Simulator link */}
            <div style={{ fontSize: 11, color: '#666' }}>
              Proximity checked every 10s.{' '}
              <span onClick={() => navigate('/simulator')}
                style={{ color: '#e94560', cursor: 'pointer', textDecoration: 'underline' }}>
                Update position
              </span>
            </div>

            {/* Error */}
            {actionError && (
              <div style={{ color: '#ef9a9a', fontSize: 12 }}>{actionError}</div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleComplete}
                disabled={!allCompleted}
                title={!allCompleted ? `Reach all key points first (${completed}/${total})` : 'Complete tour'}
                style={{ ...completeBtnStyle, opacity: allCompleted ? 1 : 0.4, cursor: allCompleted ? 'pointer' : 'not-allowed' }}
              >✓ Complete</button>
              <button onClick={handleAbandon} style={abandonBtnStyle}>✕ Abandon</button>
            </div>
            {!allCompleted && (
              <p style={{ fontSize: 11, color: '#888', margin: 0 }}>
                Complete all {total} key points to finish the tour.
              </p>
            )}

            {/* Timestamps */}
            <div style={{ fontSize: 11, color: '#555', borderTop: '1px solid #0f3460', paddingTop: 8 }}>
              Started: {new Date(execution.startedAt).toLocaleString()}
              {execution.lastActivity && (
                <><br />Last activity: {new Date(execution.lastActivity).toLocaleString()}</>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: '#aaa',
  cursor: 'pointer', fontSize: 14, padding: '0 4px', lineHeight: 1,
};

const completeBtnStyle: React.CSSProperties = {
  flex: 1, background: '#1b5e20', color: '#fff', border: 'none',
  borderRadius: 6, padding: '8px 0', cursor: 'pointer', fontSize: 12, fontWeight: 600,
};

const abandonBtnStyle: React.CSSProperties = {
  flex: 1, background: '#b71c1c', color: '#fff', border: 'none',
  borderRadius: 6, padding: '8px 0', cursor: 'pointer', fontSize: 12, fontWeight: 600,
};
