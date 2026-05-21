import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { blogClient } from '../../api/client';

export default function BlogCreatePage() {
  const [form, setForm] = useState({ title: '', description: '' });
  const [images, setImages] = useState<File[]>([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const data = new FormData();
      data.append('title', form.title);
      data.append('description', form.description);
      images.forEach(img => data.append('images', img));

      const res = await blogClient.post('/api/blogs', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      navigate(`/blogs/${res.data.id}`);
    } catch {
      setError('Failed to create blog');
    }
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <h1 className="page-title">New Blog</h1>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>Content (Markdown supported)</label>
            <textarea rows={10} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              style={{ resize: 'vertical' }} required />
          </div>
          <div className="form-group">
            <label>Images (optional)</label>
            <input type="file" accept="image/*" multiple style={{ padding: 4 }}
              onChange={e => setImages(Array.from(e.target.files || []))} />
          </div>
          {error && <p className="error" style={{ marginBottom: 8 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" type="submit">Publish</button>
            <button className="btn-secondary" type="button" onClick={() => navigate('/blogs')}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
