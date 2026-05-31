import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { toursClient } from '../../api/client';
import { useTourExecution } from '../../context/TourExecutionContext';

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

export default function ActiveTourPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { execution, tour, keyPoints, notification, setExecution } = useTourExecution();
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    toursClient.get('/api/tourist-position')
      .then(res => setCurrentPos({ lat: res.data.latitude, lng: res.data.longitude }))
      .catch(() => {});
  }, []);

  // If context has no execution (page refresh), load it directly
  useEffect(() => {
    if (!execution && id) {
      toursClient.get(`/api/executions/${id}`)
        .then(res => setExecution(res.data))
        .catch(() => setError('Session not found.'));
    }
  }, [id]);

  if (!execution || !tour) return <p>Loading...</p>;

  const completedKpIds = new Set(execution.completedKeyPoints.map(c => c.keyPointId));
  const mapCenter: [number, number] = currentPos
    ? [currentPos.lat, currentPos.lng]
    : keyPoints.length > 0
      ? [keyPoints[0].latitude, keyPoints[0].longitude]
      : [44.8176, 20.4569];

  const isActive = execution.status === 'ACTIVE';

  async function handleAbandon() {
    try {
      const res = await toursClient.post(`/api/executions/${execution!.id}/abandon`);
      setExecution(res.data);
    } catch (err: any) {
      setError(err.response?.data || 'Failed to abandon tour');
    }
  }

  async function handleComplete() {
    try {
      const res = await toursClient.post(`/api/executions/${execution!.id}/complete`);
      setExecution(res.data);
    } catch (err: any) {
      setError(err.response?.data || 'Failed to complete tour');
    }
  }

  return (
    <div style={{ maxWidth: 800 }}>
      {/* Header */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ marginBottom: 4 }}>{tour.name}</h2>
            <span style={{
              fontSize: 13, padding: '2px 10px', borderRadius: 12, fontWeight: 600,
              background: isActive ? '#e6f4ea' : execution.status === 'COMPLETED' ? '#e3f2fd' : '#fce8e6',
              color: isActive ? '#2e7d32' : execution.status === 'COMPLETED' ? '#1565c0' : '#c62828',
            }}>
              {execution.status}
            </span>
          </div>
          {isActive ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" onClick={handleComplete}>Complete Tour</button>
              <button className="btn-secondary" onClick={handleAbandon}>Abandon</button>
            </div>
          ) : (
            <button className="btn-secondary" onClick={() => navigate('/tours')}>Back to Tours</button>
          )}
        </div>

        <p style={{ fontSize: 13, color: '#888', marginTop: 8 }}>
          Started: {new Date(execution.startedAt).toLocaleString()}
          {execution.completedAt && ` · Completed: ${new Date(execution.completedAt).toLocaleString()}`}
          {execution.abandonedAt && ` · Abandoned: ${new Date(execution.abandonedAt).toLocaleString()}`}
          {execution.lastActivity && ` · Last activity: ${new Date(execution.lastActivity).toLocaleString()}`}
        </p>

        {error && (
          <p style={{ color: '#dc3545', background: '#fff0f0', padding: '8px 12px', borderRadius: 6, fontSize: 13, marginTop: 8 }}>
            {error}
          </p>
        )}
        {notification && (
          <p style={{ color: '#2e7d32', background: '#e6f4ea', padding: '8px 12px', borderRadius: 6, fontSize: 13, marginTop: 8 }}>
            {notification}
          </p>
        )}
        {isActive && (
          <p style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
            Proximity is checked every 10s automatically. Update your position in the{' '}
            <a href="/simulator" style={{ color: '#1976d2' }}>Position Simulator</a>.
          </p>
        )}
      </div>

      {/* Progress */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 12 }}>
          Progress: {execution.completedKeyPoints.length} / {keyPoints.length} key points
        </h3>
        <div style={{ background: '#eee', borderRadius: 8, height: 10, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{
            background: '#2e7d32',
            width: `${keyPoints.length > 0 ? (execution.completedKeyPoints.length / keyPoints.length) * 100 : 0}%`,
            height: '100%',
            transition: 'width 0.5s ease',
          }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {keyPoints.map((kp, index) => {
            const done = completedKpIds.has(kp.id);
            const ckp = execution.completedKeyPoints.find(c => c.keyPointId === kp.id);
            return (
              <div key={kp.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 8,
                background: done ? '#e6f4ea' : '#f9f9f9',
                border: `1px solid ${done ? '#a5d6a7' : '#eee'}`,
              }}>
                <span style={{ fontSize: 18 }}>{done ? '✅' : '⭕'}</span>
                <div>
                  <strong style={{ fontSize: 14 }}>{index + 1}. {kp.name}</strong>
                  {done && ckp && (
                    <p style={{ fontSize: 12, color: '#555', margin: 0 }}>
                      Reached at: {new Date(ckp.completedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Map */}
      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Map</h3>
        <MapContainer center={mapCenter} zoom={14} style={{ height: 400, borderRadius: 8 }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {keyPoints.length > 1 && (
            <Polyline positions={keyPoints.map(kp => [kp.latitude, kp.longitude] as [number, number])}
              color="#1976d2" weight={3} dashArray="6,4" />
          )}
          {keyPoints.map((kp, index) => (
            <Marker key={kp.id} position={[kp.latitude, kp.longitude]}
              icon={completedKpIds.has(kp.id) ? completedIcon : new L.Icon.Default()}>
              <Popup>
                <strong>{index + 1}. {kp.name}</strong><br />
                {completedKpIds.has(kp.id) ? '✅ Completed' : '⭕ Not yet reached'}
              </Popup>
            </Marker>
          ))}
          {currentPos && (
            <Marker position={[currentPos.lat, currentPos.lng]} icon={currentPosIcon}>
              <Popup>📍 Your current position</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
