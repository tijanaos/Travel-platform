import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { toursClient } from '../../api/client';
import { KeyPoint, Tour, TransportTime } from '../../types';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const transportTypes: Array<{ type: TransportTime['type']; label: string }> = [
  { type: 'WALKING', label: 'Walking' },
  { type: 'BICYCLE', label: 'Bicycle' },
  { type: 'CAR', label: 'Car' },
];

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onMapClick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

export default function TourCreatePage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [tour, setTour] = useState<Tour | null>(null);
  const [form, setForm] = useState({ name: '', description: '', difficulty: 'EASY', tags: '' });
  const [keyPoints, setKeyPoints] = useState<KeyPoint[]>([]);
  const [transportTimes, setTransportTimes] = useState<TransportTime[]>([]);
  const [pendingLatLng, setPendingLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [kpForm, setKpForm] = useState({ name: '', description: '' });
  const [kpImage, setKpImage] = useState<File | null>(null);
  const [priceDraft, setPriceDraft] = useState('0');
  const [timeDrafts, setTimeDrafts] = useState<Record<TransportTime['type'], string>>({
    WALKING: '',
    BICYCLE: '',
    CAR: '',
  });
  const [error, setError] = useState('');
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (keyPoints.length < 2) {
      setRouteCoords(keyPoints.map(kp => [kp.latitude, kp.longitude]));
      return;
    }

    const coords = keyPoints.map(kp => `${kp.longitude},${kp.latitude}`).join(';');
    fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`)
      .then(res => res.json())
      .then(data => {
        if (data.routes?.[0]) {
          setRouteCoords(data.routes[0].geometry.coordinates.map(
            ([lng, lat]: [number, number]) => [lat, lng]
          ));
        }
      })
      .catch(() => {
        setRouteCoords(keyPoints.map(kp => [kp.latitude, kp.longitude]));
      });
  }, [keyPoints]);

  async function handleCreateDraft(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        name: form.name,
        description: form.description,
        difficulty: form.difficulty,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      };
      const res = await toursClient.post('/api/tours', payload);
      setTour(res.data);
      setPriceDraft(String(res.data.price ?? 0));
      setStep(2);
    } catch {
      setError('Failed to create draft tour');
    }
  }

  async function submitKeyPoint(e: React.FormEvent) {
    e.preventDefault();
    if (!tour || !pendingLatLng) return;
    setError('');
    try {
      const data = new FormData();
      data.append('name', kpForm.name);
      data.append('description', kpForm.description);
      data.append('latitude', String(pendingLatLng.lat));
      data.append('longitude', String(pendingLatLng.lng));
      if (kpImage) data.append('image', kpImage);

      const res = await toursClient.post(`/api/tours/${tour.id}/keypoints`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setKeyPoints(kp => [...kp, res.data]);
      setPendingLatLng(null);
      setKpForm({ name: '', description: '' });
      setKpImage(null);
    } catch {
      setError('Failed to add key point');
    }
  }

  async function deleteKeyPoint(kpId: number) {
    if (!tour) return;
    setError('');
    try {
      await toursClient.delete(`/api/tours/${tour.id}/keypoints/${kpId}`);
      setKeyPoints(kp => kp.filter(k => k.id !== kpId));
    } catch {
      setError('Failed to delete key point');
    }
  }

  async function addTransportTime(type: TransportTime['type']) {
    if (!tour) return;
    const duration = Number(timeDrafts[type]);
    if (!duration || duration < 1) return;
    setError('');
    try {
      const res = await toursClient.post(`/api/tours/${tour.id}/transport-times`, {
        type,
        durationMinutes: duration,
      });
      setTransportTimes(tt => [...tt.filter(t => t.type !== type), res.data]);
      setTimeDrafts(drafts => ({ ...drafts, [type]: '' }));
    } catch {
      setError('Failed to add transport time');
    }
  }

  async function savePrice() {
    if (!tour) return;
    const price = Number(priceDraft);
    if (Number.isNaN(price) || price < 0) {
      setError('Price must be zero or greater');
      return;
    }
    setError('');
    try {
      const res = await toursClient.patch(`/api/tours/${tour.id}/price`, { price });
      setTour(res.data);
      setPriceDraft(String(res.data.price ?? 0));
    } catch (err: any) {
      setError(err.response?.data || 'Failed to update price');
    }
  }

  async function deleteTransportTime(ttId: number) {
    if (!tour) return;
    setError('');
    try {
      await toursClient.delete(`/api/tours/${tour.id}/transport-times/${ttId}`);
      setTransportTimes(tt => tt.filter(t => t.id !== ttId));
    } catch {
      setError('Failed to delete transport time');
    }
  }

  async function publishTour() {
    if (!tour) return;
    setError('');
    try {
      const res = await toursClient.post(`/api/tours/${tour.id}/publish`);
      setTour(res.data);
      navigate(`/tours/${tour.id}`);
    } catch (err: any) {
      setError(err.response?.data || 'The tour is not ready to publish yet');
    }
  }

  const existingTimeByType = Object.fromEntries(transportTimes.map(tt => [tt.type, tt])) as Partial<Record<TransportTime['type'], TransportTime>>;
  const mapCenter: [number, number] = keyPoints.length > 0
    ? [keyPoints[0].latitude, keyPoints[0].longitude]
    : [44.8176, 20.4569];

  return (
    <div style={{ maxWidth: 820 }}>
      <h1 className="page-title">Create New Tour</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <span style={{ padding: '6px 10px', borderRadius: 6, background: step === 1 ? '#1a1a2e' : '#e8f0fe', color: step === 1 ? 'white' : '#1a1a2e', fontSize: 13 }}>
          1. Tour details
        </span>
        <span style={{ padding: '6px 10px', borderRadius: 6, background: step === 2 ? '#1a1a2e' : '#e8f0fe', color: step === 2 ? 'white' : '#1a1a2e', fontSize: 13 }}>
          2. Key points and travel times
        </span>
      </div>

      {step === 1 && (
        <div className="card">
          <form onSubmit={handleCreateDraft}>
            <div className="form-group">
              <label>Tour Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea rows={4} value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                style={{ resize: 'vertical' }} required />
            </div>
            <div className="form-group">
              <label>Difficulty</label>
              <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>
            <div className="form-group">
              <label>Tags (comma separated)</label>
              <input value={form.tags} placeholder="nature, hiking, city"
                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} required />
            </div>
            {error && <p className="error" style={{ marginBottom: 8 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" type="submit">Continue to Setup</button>
              <button className="btn-secondary" type="button" onClick={() => navigate('/tours')}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {step === 2 && tour && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <h2 style={{ marginBottom: 8 }}>{tour.name}</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, background: '#fff7e6', color: '#9a6700', padding: '2px 8px', borderRadius: 12 }}>Draft</span>
              <span style={{ fontSize: 13, background: '#eee', padding: '2px 8px', borderRadius: 12 }}>Price: ${tour.price}</span>
              <span style={{ fontSize: 13, background: '#eee', padding: '2px 8px', borderRadius: 12 }}>{tour.difficulty}</span>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ marginBottom: 12 }}>Tour Price</h3>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Price</label>
                <input type="number" min={0} step="0.01" value={priceDraft}
                  onChange={e => setPriceDraft(e.target.value)}
                  style={{ width: 140 }} />
              </div>
              <button className="btn-primary" type="button" onClick={savePrice}>Save Price</button>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ marginBottom: 12 }}>Transport Times</h3>
            <div style={{ display: 'grid', gap: 10 }}>
              {transportTypes.map(({ type, label }) => {
                const existing = existingTimeByType[type];
                return (
                  <div key={type} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <strong style={{ width: 90 }}>{label}</strong>
                    {existing ? (
                      <>
                        <span style={{ fontSize: 13, color: '#555' }}>{existing.durationMinutes} min</span>
                        <button className="btn-secondary" type="button" onClick={() => deleteTransportTime(existing.id)}>Remove</button>
                      </>
                    ) : (
                      <>
                        <input type="number" min={1} placeholder="Minutes" value={timeDrafts[type]}
                          onChange={e => setTimeDrafts(drafts => ({ ...drafts, [type]: e.target.value }))}
                          style={{ width: 120 }} />
                        <button className="btn-primary" type="button" onClick={() => addTransportTime(type)}>Add</button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ marginBottom: 12 }}>Key Points ({keyPoints.length})</h3>
            <p style={{ fontSize: 13, color: '#1976d2', background: '#e3f2fd', padding: '8px 12px', borderRadius: 6, marginBottom: 8 }}>
              Click the map to choose the location for the next key point.
            </p>
            <MapContainer center={mapCenter} zoom={13} style={{ height: 360, borderRadius: 8, marginBottom: 12 }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapClickHandler onMapClick={(lat, lng) => setPendingLatLng({ lat, lng })} />
              {routeCoords.length > 1 && (
                <Polyline positions={routeCoords} color="#1976d2" weight={3} dashArray="6,4" />
              )}
              {keyPoints.map((kp, index) => (
                <Marker key={kp.id} position={[kp.latitude, kp.longitude]}>
                  <Popup><strong>{index + 1}. {kp.name}</strong></Popup>
                </Marker>
              ))}
              {pendingLatLng && (
                <Marker position={[pendingLatLng.lat, pendingLatLng.lng]}>
                  <Popup>New key point location</Popup>
                </Marker>
              )}
            </MapContainer>

            {pendingLatLng && (
              <form onSubmit={submitKeyPoint} style={{ background: '#f0f7ff', padding: 16, borderRadius: 8 }}>
                <p style={{ fontSize: 13, color: '#1976d2', marginBottom: 8 }}>
                  Selected: {pendingLatLng.lat.toFixed(5)}, {pendingLatLng.lng.toFixed(5)}
                </p>
                <div className="form-group">
                  <label>Name</label>
                  <input value={kpForm.name} onChange={e => setKpForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <input value={kpForm.description} onChange={e => setKpForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Image (optional)</label>
                  <input type="file" accept="image/*" style={{ padding: 4 }}
                    onChange={e => setKpImage(e.target.files?.[0] || null)} />
                </div>
                <button className="btn-primary" type="submit">Save Key Point</button>
              </form>
            )}

            {keyPoints.length > 0 && (
              <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                {keyPoints.map((kp, index) => (
                  <div key={kp.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, borderBottom: '1px solid #eee', paddingBottom: 8 }}>
                    <span>{index + 1}. {kp.name}</span>
                    <button className="btn-secondary" type="button" onClick={() => deleteKeyPoint(kp.id)}>Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="error" style={{ marginBottom: 12 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" type="button" onClick={publishTour}>Publish Tour</button>
            <button className="btn-secondary" type="button" onClick={() => navigate(`/tours/${tour.id}`)}>Finish as Draft</button>
          </div>
        </>
      )}
    </div>
  );
}
