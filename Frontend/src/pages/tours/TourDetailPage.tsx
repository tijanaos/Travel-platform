import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { toursClient } from '../../api/client';
import { KeyPoint, Review, Tour, TransportTime, TourPurchaseToken } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useTourExecution } from '../../context/TourExecutionContext';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const editIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const transportTypes: Array<{ type: TransportTime['type']; label: string }> = [
  { type: 'WALKING', label: 'Walking' },
  { type: 'BICYCLE', label: 'Bicycle' },
  { type: 'CAR', label: 'Car' },
];

const statusColor: Record<Tour['status'], string> = {
  DRAFT: '#888',
  PUBLISHED: '#2980b9',
  ARCHIVED: '#7f8c8d',
};

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onMapClick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

export default function TourDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setExecution } = useTourExecution();
  const [tour, setTour] = useState<Tour | null>(null);
  const [keyPoints, setKeyPoints] = useState<KeyPoint[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [transportTimes, setTransportTimes] = useState<TransportTime[]>([]);
  const [addingKP, setAddingKP] = useState(false);
  const [pendingLatLng, setPendingLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [kpForm, setKpForm] = useState({ name: '', description: '' });
  const [kpImage, setKpImage] = useState<File | null>(null);
  const [editingKP, setEditingKP] = useState<KeyPoint | null>(null);
  const [editLatLng, setEditLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [editImage, setEditImage] = useState<File | null>(null);
  const [timeDrafts, setTimeDrafts] = useState<Record<TransportTime['type'], string>>({
    WALKING: '',
    BICYCLE: '',
    CAR: '',
  });
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '', visitDate: '' });
  const [reviewImages, setReviewImages] = useState<File[]>([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [error, setError] = useState('');
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [purchased, setPurchased] = useState(false);
  const [inCart, setInCart] = useState(false);
  const [cartMsg, setCartMsg] = useState('');
  const [startMsg, setStartMsg] = useState('');

  useEffect(() => {
    toursClient.get(`/api/tours/${id}`).then(res => setTour(res.data));
    toursClient.get(`/api/tours/${id}/keypoints`).then(res => setKeyPoints(res.data));
    toursClient.get(`/api/tours/${id}/reviews`).then(res => setReviews(res.data)).catch(() => {});
    toursClient.get(`/api/tours/${id}/transport-times`).then(res => setTransportTimes(res.data)).catch(() => {});
    if (user?.role === 'tourist') {
      toursClient.get('/api/purchases').then(res => {
        const tokens: TourPurchaseToken[] = res.data;
        setPurchased(tokens.some(t => t.tourId === Number(id)));
      }).catch(() => {});
      toursClient.get('/api/cart').then(res => {
        setInCart(res.data.items.some((item: { tourId: number }) => item.tourId === Number(id)));
      }).catch(() => {});
    }
  }, [id]);

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
      .catch(() => setRouteCoords(keyPoints.map(kp => [kp.latitude, kp.longitude])));
  }, [keyPoints]);

  if (!tour) return <p>Loading...</p>;

  const isAuthor = user?.id === tour.authorId;
  const isTourist = user?.role === 'tourist';
  const isMapInteractive = addingKP || !!editingKP;
  const existingTimeByType = Object.fromEntries(transportTimes.map(tt => [tt.type, tt])) as Partial<Record<TransportTime['type'], TransportTime>>;
  const mapCenter: [number, number] = keyPoints.length > 0
    ? [keyPoints[0].latitude, keyPoints[0].longitude]
    : [44.8176, 20.4569];

  function handleMapClick(lat: number, lng: number) {
    if (editingKP) {
      setEditLatLng({ lat, lng });
    } else if (addingKP) {
      setPendingLatLng({ lat, lng });
    }
  }

  function startEditKP(kp: KeyPoint) {
    setEditingKP(kp);
    setEditLatLng({ lat: kp.latitude, lng: kp.longitude });
    setEditForm({ name: kp.name, description: kp.description || '' });
    setEditImage(null);
    setAddingKP(false);
    setPendingLatLng(null);
  }

  function cancelEditKP() {
    setEditingKP(null);
    setEditLatLng(null);
    setEditForm({ name: '', description: '' });
    setEditImage(null);
  }

  async function refreshTour() {
    const tourRes = await toursClient.get(`/api/tours/${id}`);
    setTour(tourRes.data);
  }

  async function submitKeyPoint(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingLatLng) return;
    setError('');
    try {
      const data = new FormData();
      data.append('name', kpForm.name);
      data.append('description', kpForm.description);
      data.append('latitude', String(pendingLatLng.lat));
      data.append('longitude', String(pendingLatLng.lng));
      if (kpImage) data.append('image', kpImage);
      const res = await toursClient.post(`/api/tours/${id}/keypoints`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setKeyPoints(kp => [...kp, res.data]);
      await refreshTour();
      setPendingLatLng(null);
      setKpForm({ name: '', description: '' });
      setKpImage(null);
      setAddingKP(false);
    } catch {
      setError('Failed to add key point');
    }
  }

  async function submitEditKP(e: React.FormEvent) {
    e.preventDefault();
    if (!editingKP || !editLatLng) return;
    setError('');
    try {
      const data = new FormData();
      data.append('name', editForm.name);
      data.append('description', editForm.description);
      data.append('latitude', String(editLatLng.lat));
      data.append('longitude', String(editLatLng.lng));
      if (editImage) data.append('image', editImage);
      const res = await toursClient.put(`/api/tours/${id}/keypoints/${editingKP.id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setKeyPoints(kp => kp.map(k => k.id === editingKP.id ? res.data : k));
      await refreshTour();
      cancelEditKP();
    } catch {
      setError('Failed to update key point');
    }
  }

  async function deleteKeyPoint(kpId: number) {
    setError('');
    try {
      await toursClient.delete(`/api/tours/${id}/keypoints/${kpId}`);
      setKeyPoints(kp => kp.filter(k => k.id !== kpId));
      await refreshTour();
    } catch {
      setError('Failed to delete key point');
    }
  }

  async function addTransportTime(type: TransportTime['type']) {
    const duration = Number(timeDrafts[type]);
    if (!duration || duration < 1) return;
    setError('');
    try {
      const res = await toursClient.post(`/api/tours/${id}/transport-times`, { type, durationMinutes: duration });
      setTransportTimes(tt => [...tt.filter(t => t.type !== type), res.data]);
      setTimeDrafts(drafts => ({ ...drafts, [type]: '' }));
    } catch {
      setError('Failed to add transport time');
    }
  }

  async function deleteTransportTime(ttId: number) {
    setError('');
    try {
      await toursClient.delete(`/api/tours/${id}/transport-times/${ttId}`);
      setTransportTimes(tt => tt.filter(t => t.id !== ttId));
    } catch {
      setError('Failed to delete transport time');
    }
  }

  async function publishTour() {
    setError('');
    try {
      const res = await toursClient.post(`/api/tours/${id}/publish`);
      setTour(res.data);
    } catch (err: any) {
      setError(err.response?.data || 'Failed to publish tour');
    }
  }

  async function archiveTour() {
    setError('');
    try {
      const res = await toursClient.post(`/api/tours/${id}/archive`);
      setTour(res.data);
    } catch (err: any) {
      setError(err.response?.data || 'Failed to archive tour');
    }
  }

  async function reactivateTour() {
    setError('');
    try {
      const res = await toursClient.post(`/api/tours/${id}/reactivate`);
      setTour(res.data);
    } catch (err: any) {
      setError(err.response?.data || 'Failed to reactivate tour');
    }
  }

  async function addToCart() {
    setCartMsg('');
    try {
      await toursClient.post('/api/cart/items', { tourId: Number(id) });
      setInCart(true);
      setCartMsg('Added to cart!');
    } catch (err: any) {
      setCartMsg(err.response?.data || 'Failed to add to cart');
    }
  }

  async function startTour() {
    setStartMsg('');
    try {
      const res = await toursClient.post('/api/executions', { tourId: Number(id) });
      setExecution(res.data);
      navigate(`/executions/${res.data.id}`);
    } catch (err: any) {
      setStartMsg(err.response?.data || 'Failed to start tour');
    }
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const data = new FormData();
      data.append('rating', String(reviewForm.rating));
      data.append('comment', reviewForm.comment);
      data.append('visitDate', reviewForm.visitDate);
      reviewImages.forEach(img => data.append('images', img));
      const res = await toursClient.post(`/api/tours/${id}/reviews`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setReviews(r => [...r, res.data]);
      setShowReviewForm(false);
      setReviewForm({ rating: 5, comment: '', visitDate: '' });
      setReviewImages([]);
    } catch {
      setError('Failed to submit review. You may have already reviewed this tour.');
    }
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h2 style={{ marginBottom: 8 }}>{tour.name}</h2>
          {isAuthor && (
            <div style={{ display: 'flex', gap: 8 }}>
              {tour.status === 'DRAFT' && <button className="btn-primary" onClick={publishTour}>Publish Tour</button>}
              {tour.status === 'PUBLISHED' && <button className="btn-secondary" onClick={archiveTour}>Archive</button>}
              {tour.status === 'ARCHIVED' && <button className="btn-primary" onClick={reactivateTour}>Reactivate</button>}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, background: '#eee', padding: '2px 8px', borderRadius: 12 }}>{tour.difficulty}</span>
          <span style={{ fontSize: 13, padding: '2px 8px', borderRadius: 12, background: '#eee', color: statusColor[tour.status], fontWeight: 600 }}>
            {tour.status}
          </span>
          {tour.lengthKm != null && <span style={{ fontSize: 13, color: '#555' }}>{tour.lengthKm} km</span>}
          <span style={{ fontSize: 13, color: '#888' }}>Price: ${tour.price}</span>
        </div>

        {tour.publishedAt && (
          <p style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
            Published: {new Date(tour.publishedAt).toLocaleString()}
          </p>
        )}
        {tour.archivedAt && (
          <p style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
            Archived: {new Date(tour.archivedAt).toLocaleString()}
          </p>
        )}

        <p style={{ marginBottom: 12, color: '#444' }}>{tour.description}</p>
        {tour.tags?.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {tour.tags.map(tag => (
              <span key={tag} style={{ fontSize: 12, background: '#e8f0fe', color: '#1a1a2e', padding: '2px 8px', borderRadius: 12 }}>{tag}</span>
            ))}
          </div>
        )}

        {error && (
          <p style={{ color: '#dc3545', fontSize: 13, marginTop: 10, background: '#fff0f0', padding: '8px 12px', borderRadius: 6 }}>
            {error}
          </p>
        )}

        {isTourist && (tour.status === 'PUBLISHED' || tour.status === 'ARCHIVED') && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {tour.status === 'PUBLISHED' && (
              purchased ? (
                <span style={{ fontSize: 14, color: '#389e0d', fontWeight: 600 }}>✓ Purchased</span>
              ) : inCart ? (
                <span style={{ fontSize: 14, color: '#1976d2' }}>In cart</span>
              ) : (
                <button className="btn-primary" onClick={addToCart}>Add to Cart</button>
              )
            )}
            {purchased && (
              <button className="btn-primary" onClick={startTour}
                style={{ background: '#2e7d32' }}>
                ▶ Start Tour
              </button>
            )}
            {cartMsg && <span style={{ fontSize: 13, color: inCart ? '#389e0d' : '#dc3545' }}>{cartMsg}</span>}
            {startMsg && <span style={{ fontSize: 13, color: '#dc3545' }}>{startMsg}</span>}
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
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
                    {isAuthor && <button className="btn-secondary" onClick={() => deleteTransportTime(existing.id)}>Remove</button>}
                  </>
                ) : isAuthor ? (
                  <>
                    <input type="number" min={1} placeholder="Minutes" value={timeDrafts[type]}
                      onChange={e => setTimeDrafts(drafts => ({ ...drafts, [type]: e.target.value }))}
                      style={{ width: 120 }} />
                    <button className="btn-primary" onClick={() => addTransportTime(type)}>Add</button>
                  </>
                ) : (
                  <span style={{ color: '#888', fontSize: 13 }}>Not defined</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3>Key Points ({keyPoints.length}{!isAuthor && !purchased && tour.status === 'PUBLISHED' ? ' - starting point only' : ''})</h3>
          {isAuthor && !editingKP && (
            <button className={addingKP ? 'btn-secondary' : 'btn-primary'}
              onClick={() => { setAddingKP(!addingKP); setPendingLatLng(null); }}>
              {addingKP ? 'Cancel' : '+ Add Point'}
            </button>
          )}
        </div>

        {addingKP && !pendingLatLng && (
          <p style={{ fontSize: 13, color: '#1976d2', background: '#e3f2fd', padding: '8px 12px', borderRadius: 6, marginBottom: 8 }}>
            Click the map to choose the key point location.
          </p>
        )}
        {editingKP && (
          <p style={{ fontSize: 13, color: '#e65100', background: '#fff3e0', padding: '8px 12px', borderRadius: 6, marginBottom: 8 }}>
            Editing "{editingKP.name}". Click the map to change its position.
          </p>
        )}

        <MapContainer center={mapCenter} zoom={13} style={{ height: 380, borderRadius: 8, marginBottom: 12 }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {isMapInteractive && <MapClickHandler onMapClick={handleMapClick} />}
          {routeCoords.length > 1 && <Polyline positions={routeCoords} color="#1976d2" weight={3} dashArray="6,4" />}
          {keyPoints.map((kp, index) => (
            <Marker key={kp.id} position={[kp.latitude, kp.longitude]}>
              <Popup>
                <strong>{index + 1}. {kp.name}</strong><br />
                {kp.description && <span style={{ color: '#555' }}>{kp.description}<br /></span>}
                {kp.imageUrl && <img src={`http://localhost:8082${kp.imageUrl}`} alt="" style={{ width: 100, marginTop: 4 }} />}
                {isAuthor && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <button onClick={() => startEditKP(kp)}
                      style={{ background: '#1976d2', color: 'white', border: 'none', padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                      Edit
                    </button>
                    <button onClick={() => deleteKeyPoint(kp.id)}
                      style={{ background: '#dc3545', color: 'white', border: 'none', padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                      Delete
                    </button>
                  </div>
                )}
              </Popup>
            </Marker>
          ))}
          {pendingLatLng && addingKP && (
            <Marker position={[pendingLatLng.lat, pendingLatLng.lng]}><Popup>New key point location</Popup></Marker>
          )}
          {editingKP && editLatLng && (
            <Marker position={[editLatLng.lat, editLatLng.lng]} icon={editIcon}><Popup>New position for {editingKP.name}</Popup></Marker>
          )}
        </MapContainer>

        {pendingLatLng && addingKP && (
          <form onSubmit={submitKeyPoint} style={{ background: '#f0f7ff', padding: 16, borderRadius: 8, marginBottom: 12 }}>
            <p style={{ fontSize: 13, color: '#1976d2', marginBottom: 8 }}>
              Selected: {pendingLatLng.lat.toFixed(5)}, {pendingLatLng.lng.toFixed(5)}
              <button type="button" onClick={() => setPendingLatLng(null)}
                style={{ marginLeft: 10, fontSize: 11, background: 'none', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer', padding: '1px 6px' }}>
                Change
              </button>
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
              <input type="file" accept="image/*" style={{ padding: 4 }} onChange={e => setKpImage(e.target.files?.[0] || null)} />
            </div>
            <button className="btn-primary" type="submit">Save Point</button>
          </form>
        )}

        {editingKP && (
          <form onSubmit={submitEditKP} style={{ background: '#fff8f0', border: '1px solid #ffcc80', padding: 16, borderRadius: 8 }}>
            <h4 style={{ marginBottom: 12, color: '#e65100' }}>Edit Key Point</h4>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>
              {editLatLng ? `Position: ${editLatLng.lat.toFixed(5)}, ${editLatLng.lng.toFixed(5)}` : 'Click the map to change the position'}
            </p>
            <div className="form-group">
              <label>Name</label>
              <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Description</label>
              <input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>New image (optional)</label>
              <input type="file" accept="image/*" style={{ padding: 4 }} onChange={e => setEditImage(e.target.files?.[0] || null)} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" type="submit">Save Changes</button>
              <button className="btn-secondary" type="button" onClick={cancelEditKP}>Cancel</button>
            </div>
          </form>
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3>Reviews ({reviews.length})</h3>
          {isTourist && !showReviewForm && <button className="btn-primary" onClick={() => setShowReviewForm(true)}>Leave a Review</button>}
        </div>
        {showReviewForm && (
          <form onSubmit={submitReview} style={{ background: '#f9f9f9', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <div className="form-group">
              <label>Rating (1-5)</label>
              <input type="number" min={1} max={5} value={reviewForm.rating}
                onChange={e => setReviewForm(f => ({ ...f, rating: Number(e.target.value) }))} required />
            </div>
            <div className="form-group">
              <label>Comment</label>
              <textarea rows={3} value={reviewForm.comment}
                onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))} style={{ resize: 'vertical' }} />
            </div>
            <div className="form-group">
              <label>Visit Date</label>
              <input type="date" value={reviewForm.visitDate}
                onChange={e => setReviewForm(f => ({ ...f, visitDate: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Images (optional)</label>
              <input type="file" accept="image/*" multiple style={{ padding: 4 }}
                onChange={e => setReviewImages(Array.from(e.target.files || []))} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" type="submit">Submit Review</button>
              <button className="btn-secondary" type="button" onClick={() => setShowReviewForm(false)}>Cancel</button>
            </div>
          </form>
        )}
        {reviews.length === 0 ? (
          <p style={{ color: '#888', fontSize: 14 }}>No reviews yet.</p>
        ) : (
          reviews.map(r => (
            <div key={r.id} style={{ borderBottom: '1px solid #eee', paddingBottom: 12, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: 14 }}>{r.touristUsername}</strong>
                <span style={{ color: '#f39c12', fontSize: 14 }}>{'*'.repeat(r.rating)}{'-'.repeat(5 - r.rating)}</span>
              </div>
              <p style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>
                Visited: {r.visitDate} | Posted: {new Date(r.createdAt).toLocaleDateString()}
              </p>
              <p style={{ fontSize: 14 }}>{r.comment}</p>
              {r.imageUrls?.map((url, i) => (
                <img key={i} src={`http://localhost:8082${url}`} alt=""
                  style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, marginTop: 6, marginRight: 6 }} />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
