import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { toursClient } from '../../api/client';
import { KeyPoint, TourExecution, ProximityResult, Tour } from '../../types';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const completedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const currentPosIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

export default function ActiveTourPage() {
  const { id } = useParams(); // execution id
  const navigate = useNavigate();

  const [execution, setExecution] = useState<TourExecution | null>(null);
  const [tour, setTour] = useState<Tour | null>(null);
  const [keyPoints, setKeyPoints] = useState<KeyPoint[]>([]);
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null);
  const [lastProximity, setLastProximity] = useState<ProximityResult | null>(null);
  const [notification, setNotification] = useState<string>('');
  const [error, setError] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadExecution();
  }, [id]);

  useEffect(() => {
    if (!execution || execution.status !== 'ACTIVE') return;

    intervalRef.current = setInterval(runProximityCheck, 10000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [execution?.id, execution?.status]);

  async function loadExecution() {
    try {
      const res = await toursClient.get(`/api/executions/${id}`);
      const exec: TourExecution = res.data;
      setExecution(exec);

      const [tourRes, kpRes, posRes] = await Promise.all([
        toursClient.get(`/api/tours/${exec.tourId}`),
        toursClient.get(`/api/tours/${exec.tourId}/keypoints`),
        toursClient.get('/api/tourist-position').catch(() => ({ data: null })),
      ]);

      setTour(tourRes.data);
      setKeyPoints(kpRes.data);
      if (posRes.data) {
        setCurrentPos({ lat: posRes.data.latitude, lng: posRes.data.longitude });
      }
    } catch {
      setError('Failed to load tour session.');
    }
  }

  async function runProximityCheck() {
    if (!execution) return;
    try {
      // 1. Fetch current position from simulator
      const posRes = await toursClient.get('/api/tourist-position').catch(() => ({ data: null }));
      if (posRes.data) {
        setCurrentPos({ lat: posRes.data.latitude, lng: posRes.data.longitude });
      }

      // 2. Send proximity check to backend
      const res = await toursClient.post(`/api/executions/${execution.id}/check-proximity`);
      const result: ProximityResult = res.data;
      setLastProximity(result);

      if (result.newKeyPointCompleted) {
        setNotification(`✓ Key point reached! (${result.totalCompleted}/${result.totalKeyPoints} completed)`);
        setTimeout(() => setNotification(''), 4000);
        // Refresh execution to get updated completedKeyPoints
        const execRes = await toursClient.get(`/api/executions/${execution.id}`);
        setExecution(execRes.data);
      }
    } catch {
      // Silently ignore proximity check errors
    }
  }

  async function handleAbandon() {
    if (!execution) return;
    try {
      const res = await toursClient.post(`/api/executions/${execution.id}/abandon`);
      setExecution(res.data);
      if (intervalRef.current) clearInterval(intervalRef.current);
    } catch (err: any) {
      setError(err.response?.data || 'Failed to abandon tour');
    }
  }

  async function handleComplete() {
    if (!execution) return;
    try {
      const res = await toursClient.post(`/api/executions/${execution.id}/complete`);
      setExecution(res.data);
      if (intervalRef.current) clearInterval(intervalRef.current);
    } catch (err: any) {
      setError(err.response?.data || 'Failed to complete tour');
    }
  }

  if (!execution || !tour) return <p>Loading...</p>;

  const completedKpIds = new Set(execution.completedKeyPoints.map(c => c.keyPointId));
  const mapCenter: [number, number] = currentPos
    ? [currentPos.lat, currentPos.lng]
    : keyPoints.length > 0
      ? [keyPoints[0].latitude, keyPoints[0].longitude]
      : [44.8176, 20.4569];

  const routeCoords: [number, number][] = keyPoints.map(kp => [kp.latitude, kp.longitude]);

  const isActive = execution.status === 'ACTIVE';

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
              color: isActive ? '#2e7d32' : execution.status === 'COMPLETED' ? '#1565c0' : '#c62828'
            }}>
              {execution.status}
            </span>
          </div>
          {isActive && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" onClick={handleComplete}>Complete Tour</button>
              <button className="btn-secondary" onClick={handleAbandon}>Abandon</button>
            </div>
          )}
          {!isActive && (
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
            Proximity check runs every 10 seconds. Make sure your position is set in the{' '}
            <a href="/simulator" style={{ color: '#1976d2' }}>Position Simulator</a>.
          </p>
        )}
      </div>

      {/* Progress */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 12 }}>
          Progress: {execution.completedKeyPoints.length} / {keyPoints.length} key points
        </h3>
        <div style={{ background: '#eee', borderRadius: 8, height: 10, overflow: 'hidden' }}>
          <div style={{
            background: '#2e7d32',
            width: `${keyPoints.length > 0 ? (execution.completedKeyPoints.length / keyPoints.length) * 100 : 0}%`,
            height: '100%',
            transition: 'width 0.5s ease'
          }} />
        </div>

        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {keyPoints.map((kp, index) => {
            const done = completedKpIds.has(kp.id);
            const ckp = execution.completedKeyPoints.find(c => c.keyPointId === kp.id);
            return (
              <div key={kp.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 8,
                background: done ? '#e6f4ea' : '#f9f9f9',
                border: `1px solid ${done ? '#a5d6a7' : '#eee'}`
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

          {routeCoords.length > 1 && (
            <Polyline positions={routeCoords} color="#1976d2" weight={3} dashArray="6,4" />
          )}

          {keyPoints.map((kp, index) => (
            <Marker
              key={kp.id}
              position={[kp.latitude, kp.longitude]}
              icon={completedKpIds.has(kp.id) ? completedIcon : L.Icon.Default.prototype}
            >
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
