import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { toursClient } from '../../api/client';

// Fix default Leaflet marker icons in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Posebna ikonica za trenutnu poziciju (plava)
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

  // Učitaj trenutnu poziciju pri otvaranju
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
      setMessage(`Pozicija ažurirana: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } catch {
      setError('Greška pri ažuriranju pozicije.');
    } finally {
      setSaving(false);
    }
  }

  const defaultCenter: [number, number] = position
    ? [position.latitude, position.longitude]
    : [44.8176, 20.4569]; // Beograd kao fallback

  return (
    <div style={{ maxWidth: 800 }}>
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ marginBottom: 8 }}>Simulator pozicije</h2>
        <p style={{ color: '#555', fontSize: 14, marginBottom: 0 }}>
          Kliknite na mapu da biste postavili svoju trenutnu lokaciju. Ova pozicija
          se koristi za praćenje izvedbe ture.
        </p>
      </div>

      {/* Status poruke */}
      {message && (
        <div style={{
          background: '#d4edda', color: '#155724', border: '1px solid #c3e6cb',
          borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 14,
        }}>
          ✓ {message}
        </div>
      )}
      {error && (
        <div style={{
          background: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb',
          borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 14,
        }}>
          ✗ {error}
        </div>
      )}

      {/* Info o trenutnoj poziciji */}
      <div className="card" style={{ marginBottom: 16 }}>
        {loading ? (
          <p style={{ color: '#888', fontSize: 14 }}>Učitavanje pozicije...</p>
        ) : position ? (
          <div>
            <p style={{ fontSize: 14, marginBottom: 4 }}>
              <strong>Trenutna pozicija:</strong>{' '}
              {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
            </p>
            {position.updatedAt && (
              <p style={{ fontSize: 12, color: '#888', marginBottom: 0 }}>
                Poslednje ažuriranje: {new Date(position.updatedAt).toLocaleString('sr-RS')}
              </p>
            )}
          </div>
        ) : (
          <p style={{ color: '#888', fontSize: 14, marginBottom: 0 }}>
            Pozicija još nije definisana. Kliknite na mapu da je postavite.
          </p>
        )}
      </div>

      {/* Mapa */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee', fontSize: 13, color: '#555' }}>
          {saving ? '⏳ Čuvanje pozicije...' : '🗺️ Kliknite na mapu da postavite svoju lokaciju'}
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
            <Marker
              position={[position.latitude, position.longitude]}
              icon={currentPositionIcon}
            >
              <Popup>
                <strong>Vaša trenutna lokacija</strong>
                <br />
                {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
                {position.updatedAt && (
                  <>
                    <br />
                    <span style={{ fontSize: 11, color: '#888' }}>
                      {new Date(position.updatedAt).toLocaleString('sr-RS')}
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
