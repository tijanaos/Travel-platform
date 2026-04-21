import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toursClient } from '../../api/client';

export default function TourCreatePage() {
  const [form, setForm] = useState({ name: '', description: '', difficulty: 'EASY', tags: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
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
      navigate(`/tours/${res.data.id}`);
    } catch {
      setError('Failed to create tour');
    }
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <h1 className="page-title">Create New Tour</h1>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Tour Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea rows={4} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              style={{ resize: 'vertical' }} />
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
              onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
          </div>
          {error && <p className="error" style={{ marginBottom: 8 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" type="submit">Create Tour</button>
            <button className="btn-secondary" type="button" onClick={() => navigate('/tours')}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
