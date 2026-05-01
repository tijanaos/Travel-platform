import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { blogClient } from '../../api/client';
import { Blog, Comment } from '../../types';
import { useAuth } from '../../context/AuthContext';

export default function BlogDetailPage() {
  const { id } = useParams();
  const { isAuthenticated, user } = useAuth();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [likedByMe, setLikedByMe] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [editingComment, setEditingComment] = useState<{ id: string; text: string } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    blogClient.get(`/blogs/${id}`).then(res => {
      setBlog(res.data);
      setLikedByMe(res.data.liked_by_me ?? false);
    });
    blogClient.get(`/blogs/${id}/comments`).then(res => setComments(res.data)).catch(() => {});
  }, [id]);

  async function toggleLike() {
    if (!isAuthenticated || !blog) return;
    try {
      if (likedByMe) {
        await blogClient.delete(`/blogs/${id}/like`);
        setBlog(b => b ? { ...b, likes_count: b.likes_count - 1 } : b);
        setLikedByMe(false);
      } else {
        await blogClient.post(`/blogs/${id}/like`);
        setBlog(b => b ? { ...b, likes_count: b.likes_count + 1 } : b);
        setLikedByMe(true);
      }
    } catch { }
  }

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const res = await blogClient.post(`/blogs/${id}/comments`, { text: commentText });
      setComments(c => [...c, res.data]);
      setCommentText('');
    } catch { setError('Failed to post comment'); }
  }

  async function saveEdit(commentId: string, text: string) {
    try {
      const res = await blogClient.put(`/blogs/${id}/comments/${commentId}`, { text });
      setComments(c => c.map(cm => cm.id === commentId ? res.data : cm));
      setEditingComment(null);
    } catch { setError('Failed to update comment'); }
  }

  async function deleteComment(commentId: string) {
    try {
      await blogClient.delete(`/blogs/${id}/comments/${commentId}`);
      setComments(c => c.filter(cm => cm.id !== commentId));
    } catch { setError('Failed to delete comment'); }
  }

  if (!blog) return <p>Loading...</p>;

  return (
    <div style={{ maxWidth: 750 }}>
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ marginBottom: 8, wordBreak: 'break-word' }}>{blog.title}</h2>
        <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
          {new Date(blog.created_at).toLocaleDateString()}
        </p>
        {blog.images?.map(img => (
          <img key={img.id} src={img.url} alt=""
            style={{ maxWidth: '100%', borderRadius: 6, marginBottom: 12 }} />
        ))}
        <div style={{ lineHeight: 1.7, wordBreak: 'break-word' }}>
          <ReactMarkdown>{blog.description}</ReactMarkdown>
        </div>
        <div style={{ marginTop: 16 }}>
          {isAuthenticated ? (
            <button onClick={toggleLike} style={{
              background: likedByMe ? '#e74c3c' : 'white',
              color: likedByMe ? 'white' : '#333',
              border: '1px solid #ddd', padding: '6px 16px', borderRadius: 6, cursor: 'pointer'
            }}>
              ❤ {blog.likes_count ?? 0} {likedByMe ? 'Liked' : 'Like'}
            </button>
          ) : (
            <span style={{ fontSize: 14, color: '#888' }}>❤ {blog.likes_count ?? 0} likes</span>
          )}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Comments ({comments.length})</h3>
        {comments.map(c => (
          <div key={c.id} style={{ borderBottom: '1px solid #eee', paddingBottom: 12, marginBottom: 12 }}>
            {editingComment?.id === c.id ? (
              <div>
                <textarea rows={2} value={editingComment.text} style={{ width: '100%', marginBottom: 8 }}
                  onChange={e => setEditingComment({ id: c.id, text: e.target.value })} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-primary" onClick={() => saveEdit(c.id, editingComment.text)}>Save</button>
                  <button className="btn-secondary" onClick={() => setEditingComment(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <p style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>
                  <strong>@{c.username || `User #${c.user_id}`}</strong> · {new Date(c.created_at).toLocaleString()}
                  {c.updated_at !== c.created_at && ' (edited)'}
                </p>
                <p style={{ fontSize: 14, wordBreak: 'break-word' }}>{c.text}</p>
                {user?.id === c.user_id && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }}
                      onClick={() => setEditingComment({ id: c.id, text: c.text })}>Edit</button>
                    <button className="btn-danger" style={{ padding: '4px 10px', fontSize: 12 }}
                      onClick={() => deleteComment(c.id)}>Delete</button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}

        {isAuthenticated ? (
          <form onSubmit={addComment} style={{ marginTop: 8 }}>
            <textarea rows={3} value={commentText} placeholder="Write a comment..."
              onChange={e => setCommentText(e.target.value)} style={{ marginBottom: 8 }} />
            {error && <p className="error" style={{ marginBottom: 8 }}>{error}</p>}
            <button className="btn-primary" type="submit">Post Comment</button>
          </form>
        ) : (
          <p style={{ color: '#888', fontSize: 14 }}>Login to leave a comment.</p>
        )}
      </div>
    </div>
  );
}