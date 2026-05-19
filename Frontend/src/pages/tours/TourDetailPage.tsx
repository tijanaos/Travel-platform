import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { toursClient } from '../../api/client';
import { Tour, KeyPoint, Review } from '../../types';
import { useAuth } from '../../context/AuthContext';

// Fix default marker icons for Leaflet + Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onMapClick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

export default function TourDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [tour, setTour] = useState<Tour | null>(null);
  const [keyPoints, setKeyPoints] = useState<KeyPoint[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  const [addingKP, setAddingKP] = useState(false);
  const [pendingLatLng, setPendingLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [kpForm, setKpForm] = useState({ name: '', description: '' });
  const [kpImage, setKpImage] = useState<File | null>(null);

  const [editingKP, setEditingKP] = useState<KeyPoint | null>(null);
  const [editLatLng, setEditLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [editImage, setEditImage] = useState<File | null>(null);

  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '', visitDate: '' });
  const [reviewImages, setReviewImages] = useState<File[]>([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    toursClient.get(`/api/tours/${id}`).then(res => setTour(res.data));
    toursClient.get(`/api/tours/${id}/keypoints`).then(res => setKeyPoints(res.data));
    toursClient.get(`/api/tours/${id}/reviews`).then(res => setReviews(res.data)).catch(() => {});
  }, [id]);

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

  async function submitEditKP(e: React.FormEvent) {
    e.preventDefault();
    if (!editingKP || !editLatLng) return;
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
      cancelEditKP();
    } catch { setError('Failed to update key point'); }
  }

  async function submitKeyPoint(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingLatLng) return;
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
      setPendingLatLng(null);
      setKpForm({ name: '', description: '' });
      setKpImage(null);
      setAddingKP(false);
    } catch { setError('Failed to add key point'); }
  }

  async function deleteKeyPoint(kpId: number) {
    try {
      await toursClient.delete(`/api/tours/${id}/keypoints/${kpId}`);
      setKeyPoints(kp => kp.filter(k => k.id !== kpId));
    } catch { setError('Failed to delete key point'); }
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
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
    } catch { setError('Failed to submit review. You may have already reviewed this tour.'); }
  }

  if (!tour) return <p>Loading...</p>;

  const isAuthor = user?.id === tour.authorId;
  const isTourist = user?.role === 'tourist';
  const mapCenter: [number, number] = keyPoints.length > 0
    ? [keyPoints[0].latitude, keyPoints[0].longitude]
    : [44.8176, 20.4569];

  return (
    <div style={{ maxWidth: 800 }}>
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ marginBottom: 8 }}>{tour.name}</h2>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 13, background: '#eee', padding: '2px 8px', borderRadius: 12 }}>{tour.difficulty}</span>
          <span style={{ fontSize: 13, background: '#eee', padding: '2px 8px', borderRadius: 12 }}>{tour.status}</span>
          <span style={{ fontSize: 13, color: '#888' }}>Price: ${tour.price}</span>
        </div>
        <p style={{ marginBottom: 12, color: '#444' }}>{tour.description}</p>
        {tour.tags?.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {tour.tags.map(tag => (
              <span key={tag} style={{ fontSize: 12, background: '#e8f0fe', color: '#1a1a2e', padding: '2px 8px', borderRadius: 12 }}>{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* Key Points Section */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3>Key Points ({keyPoints.length})</h3>
          {isAuthor && (
            <button className={addingKP ? 'btn-secondary' : 'btn-primary'}
              onClick={() => { setAddingKP(!addingKP); setPendingLatLng(null); }}>
              {addingKP ? 'Cancel' : '+ Add Key Point'}
            </button>
          )}
        </div>

        {addingKP && (
          <p style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>
            Click on the map to select a location for the key point.
          </p>
        )}
        {editingKP && (
          <p style={{ fontSize: 13, color: '#e67e22', marginBottom: 8 }}>
            Editing "{editingKP.name}" — click on the map to change the location.
          </p>
        )}

        <MapContainer center={mapCenter} zoom={13} style={{ height: 350, borderRadius: 8, marginBottom: 12 }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {(addingKP || editingKP) && <MapClickHandler onMapClick={handleMapClick} />}
          {keyPoints.map(kp => (
            <Marker key={kp.id} position={[kp.latitude, kp.longitude]}>
              <Popup>
                <strong>{kp.name}</strong><br />
                {kp.description}<br />
                {kp.imageUrl && <img src={`http://localhost:8082${kp.imageUrl}`} alt="" style={{ width: 100 }} />}
                {isAuthor && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                    <button onClick={() => startEditKP(kp)}
                      style={{ background: '#f39c12', color: 'white', border: 'none', padding: '2px 8px', borderRadius: 4, cursor: 'pointer' }}>
                      Edit
                    </button>
                    <button onClick={() => deleteKeyPoint(kp.id)}
                      style={{ background: '#dc3545', color: 'white', border: 'none', padding: '2px 8px', borderRadius: 4, cursor: 'pointer' }}>
                      Delete
                    </button>
                  </div>
                )}
              </Popup>
            </Marker>
          ))}
          {pendingLatLng && (
            <Marker position={[pendingLatLng.lat, pendingLatLng.lng]}>
              <Popup>New key point here</Popup>
            </Marker>
          )}
          {editingKP && editLatLng && (
            <Marker position={[editLatLng.lat, editLatLng.lng]}>
              <Popup>Updated position</Popup>
            </Marker>
          )}
        </MapContainer>

        {pendingLatLng && addingKP && (
          <form onSubmit={submitKeyPoint} style={{ background: '#f9f9f9', padding: 16, borderRadius: 8 }}>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>
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

        {editingKP && (
          <form onSubmit={submitEditKP} style={{ background: '#fff8f0', border: '1px solid #f39c12', padding: 16, borderRadius: 8 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#e67e22', marginBottom: 8 }}>
              Editing key point · Position: {editLatLng?.lat.toFixed(5)}, {editLatLng?.lng.toFixed(5)}
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
              <label>New Image (optional)</label>
              <input type="file" accept="image/*" style={{ padding: 4 }}
                onChange={e => setEditImage(e.target.files?.[0] || null)} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" type="submit">Save Changes</button>
              <button className="btn-secondary" type="button" onClick={cancelEditKP}>Cancel</button>
            </div>
          </form>
        )}
      </div>

      {/* Reviews Section */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3>Reviews ({reviews.length})</h3>
          {isTourist && !showReviewForm && (
            <button className="btn-primary" onClick={() => setShowReviewForm(true)}>Leave Review</button>
          )}
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
            {error && <p className="error" style={{ marginBottom: 8 }}>{error}</p>}
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
                <span style={{ color: '#f39c12', fontSize: 14 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
              </div>
              <p style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>
                Visited: {r.visitDate} · Posted: {new Date(r.createdAt).toLocaleDateString()}
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
