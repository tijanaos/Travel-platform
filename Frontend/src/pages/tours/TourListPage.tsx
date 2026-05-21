import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toursClient } from '../../api/client';
import { Tour, TransportTime } from '../../types';
import { useAuth } from '../../context/AuthContext';

const difficultyColor = { EASY: '#27ae60', MEDIUM: '#f39c12', HARD: '#e74c3c' };
const transportLabel: Record<string, string> = { WALKING: 'Peške', BICYCLE: 'Bicikl', CAR: 'Automobil' };

export default function TourListPage() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [transportTimes, setTransportTimes] = useState<Record<number, TransportTime[]>>({});
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    toursClient.get('/api/tours')
      .then(async res => {
        const fetched: Tour[] = res.data;
        setTours(fetched);
        const ttMap: Record<number, TransportTime[]> = {};
        await Promise.all(fetched.map(t =>
          toursClient.get(`/api/tours/${t.id}/transport-times`)
            .then(r => { ttMap[t.id] = r.data; })
            .catch(() => { ttMap[t.id] = []; })
        ));
        setTransportTimes(ttMap);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Tours</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {user?.role === 'guide' && (
            <>
              <Link to="/tours/my"><button className="btn-secondary">My Tours</button></Link>
              <Link to="/tours/new"><button className="btn-primary">+ New Tour</button></Link>
            </>
          )}
        </div>
      </div>
      {tours.length === 0 ? (
        <p style={{ color: '#666' }}>No tours available.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tours.map(tour => (
            <Link to={`/tours/${tour.id}`} key={tour.id} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <h3 style={{ color: '#1a1a2e' }}>{tour.name}</h3>
                  <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 12,
                    background: '#eee', color: difficultyColor[tour.difficulty] }}>
                    {tour.difficulty}
                  </span>
                </div>
                <p style={{ color: '#666', fontSize: 14, marginTop: 6 }}>{tour.description?.substring(0, 120)}</p>
                <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {tour.lengthKm != null && (
                    <span style={{ fontSize: 12, color: '#555' }}>{tour.lengthKm} km</span>
                  )}
                  {(transportTimes[tour.id] ?? []).map(tt => (
                    <span key={tt.id} style={{ fontSize: 12, background: '#f0f4ff', color: '#3a3a6e', padding: '2px 8px', borderRadius: 12 }}>
                      {transportLabel[tt.type]}: {tt.durationMinutes} min
                    </span>
                  ))}
                </div>
                {tour.tags?.length > 0 && (
                  <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {tour.tags.map(tag => (
                      <span key={tag} style={{ fontSize: 12, background: '#e8f0fe',
                        color: '#1a1a2e', padding: '2px 8px', borderRadius: 12 }}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
