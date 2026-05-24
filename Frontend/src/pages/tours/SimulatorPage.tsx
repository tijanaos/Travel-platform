import { useEffect, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { toursClient } from '../../api/client';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const currentPositionIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface Position {
  latitude: number;
  longitude: number;
  updatedAt?: string;
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function SimulatorPage() {
  const [position, setPosition] = useState<Position | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    toursClient
      .get<Position>('/api/tourist-position')
      .then((res) => {
        if (res.status === 200) setPosition(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleMapClick(lat: number, lng: number) {
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const res = await toursClient.put<Position>('/api/tourist-position', {
        latitude: lat,
        longitude: lng,
      });
      setPosition(res.data);
      setMessage(`Position updated: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } catch {
      setError('Failed to update your position.');
    } finally {
      setSaving(false);
    }
  }

  const defaultCenter: [number, number] = position
    ? [position.latitude, position.longitude]
    : [44.8176, 20.4569];

  return (
    <div style={{ maxWidth: 800 }}>
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ marginBottom: 8 }}>Position Simulator</h2>
        <p style={{ color: '#555', fontSize: 14, marginBottom: 0 }}>
          Click the map to set your current location. This position is used for tour execution tracking.
        </p>
      </div>

      {message && (
        <div style={{
          background: '#d4edda', color: '#155724', border: '1px solid #c3e6cb',
          borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 14,
        }}>
          {message}
        </div>
      )}
      {error && (
        <div style={{
          background: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb',
          borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 14,
        }}>
          {error}
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        {loading ? (
          <p style={{ color: '#888', fontSize: 14 }}>Loading position...</p>
        ) : position ? (
          <div>
            <p style={{ fontSize: 14, marginBottom: 4 }}>
              <strong>Current position:</strong>{' '}
              {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
            </p>
            {position.updatedAt && (
              <p style={{ fontSize: 12, color: '#888', marginBottom: 0 }}>
                Last updated: {new Date(position.updatedAt).toLocaleString()}
              </p>
            )}
          </div>
        ) : (
          <p style={{ color: '#888', fontSize: 14, marginBottom: 0 }}>
            No position has been set yet. Click the map to set it.
          </p>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee', fontSize: 13, color: '#555' }}>
          {saving ? 'Saving position...' : 'Click the map to set your location'}
        </div>
        <MapContainer
          key={`${defaultCenter[0]}-${defaultCenter[1]}`}
          center={defaultCenter}
          zoom={13}
          style={{ height: 450 }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapClickHandler onMapClick={handleMapClick} />
          {position && (
            <Marker position={[position.latitude, position.longitude]} icon={currentPositionIcon}>
              <Popup>
                <strong>Your current location</strong>
                <br />
                {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
                {position.updatedAt && (
                  <>
                    <br />
                    <span style={{ fontSize: 11, color: '#888' }}>
                      {new Date(position.updatedAt).toLocaleString()}
                    </span>
                  </>
                )}
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
