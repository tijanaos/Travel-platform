import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { followerClient } from '../../api/client';
import { Blog } from '../../types';

export default function FeedPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    followerClient.get('/api/feed')
      .then(res => setBlogs(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 className="page-title" style={{ margin: 0 }}>My Feed</h1>
        <Link to="/blogs"><button className="btn-secondary">All Blogs</button></Link>
      </div>
      {blogs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: '#666' }}>
          <p>No posts yet from people you follow.</p>
          <p style={{ fontSize: 14, marginTop: 8 }}>
            <Link to="/recommendations" style={{ color: '#667eea' }}>Discover people to follow →</Link>
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {blogs.map(blog => (
            <Link to={`/blogs/${blog.id}`} key={blog.id} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ cursor: 'pointer' }}>
                <h3 style={{ marginBottom: 8, color: '#1a1a2e', wordBreak: 'break-word' }}>{blog.title}</h3>
                <p style={{ color: '#666', fontSize: 14, marginBottom: 8 }}>
                  {new Date(blog.created_at).toLocaleDateString()}
                </p>
                <p style={{ color: '#444', fontSize: 14, wordBreak: 'break-word' }}>
                  {blog.description?.substring(0, 150)}{blog.description?.length > 150 ? '...' : ''}
                </p>
                <p style={{ marginTop: 8, fontSize: 13, color: '#888' }}>❤ {blog.likes_count ?? 0} likes</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
