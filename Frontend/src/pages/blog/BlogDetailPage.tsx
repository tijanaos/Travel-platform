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
  const [commentText, setCommentText] = useState('');
  const [editingComment, setEditingComment] = useState<{ id: number; text: string } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    blogClient.get(`/blogs/${id}`).then(res => setBlog(res.data));
    blogClient.get(`/blogs/${id}/comments`).then(res => setComments(res.data)).catch(() => { });
  }, [id]);

  async function toggleLike() {
    if (!isAuthenticated || !blog) return;
    try {
      if (blog.likedByMe) {
        await blogClient.delete(`/blogs/${id}/like`);
        setBlog(b => b ? { ...b, likedByMe: false, likesCount: b.likesCount - 1 } : b);
      } else {
        await blogClient.post(`/blogs/${id}/like`);
        setBlog(b => b ? { ...b, likedByMe: true, likesCount: b.likesCount + 1 } : b);
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

  async function saveEdit(commentId: number, text: string) {
    try {
      const res = await blogClient.put(`/blogs/${id}/comments/${commentId}`, { text });
      setComments(c => c.map(cm => cm.id === commentId ? res.data : cm));
      setEditingComment(null);
    } catch { setError('Failed to update comment'); }
  }

  async function deleteComment(commentId: number) {
    try {
      await blogClient.delete(`/blogs/${id}/comments/${commentId}`);
      setComments(c => c.filter(cm => cm.id !== commentId));
    } catch { setError('Failed to delete comment'); }
  }

  if (!blog) return <p>Loading...</p>;

  return (
    <div style={{ maxWidth: 750 }}>
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ marginBottom: 8 }}>{blog.title}</h2>
        <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
          by {blog.authorUsername} · {new Date(blog.createdAt).toLocaleDateString()}
        </p>
        {blog.images?.map((img, i) => (
          <img key={i} src={`http://localhost:8081${img}`} alt=""
            style={{ maxWidth: '100%', borderRadius: 6, marginBottom: 12 }} />
        ))}
        <div style={{ lineHeight: 1.7 }}>
          <ReactMarkdown>{blog.description}</ReactMarkdown>
        </div>
        <div style={{ marginTop: 16 }}>
          <button onClick={toggleLike} style={{
            background: blog.likedByMe ? '#e74c3c' : 'white',
            color: blog.likedByMe ? 'white' : '#333',
            border: '1px solid #ddd', padding: '6px 16px', borderRadius: 6, cursor: 'pointer'
          }}>
            ❤ {blog.likesCount ?? 0}
          </button>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Comments ({comments.length})</h3>
        {comments.length === 0 && (
          <p style={{ color: '#aaa', fontSize: 14, marginBottom: 12 }}>No comments yet :c.</p>
        )}
        {comments.map(c => {
          const authorId = (c as any).author_id ?? (c as any).user_id ?? c.authorId;
          const authorName = (c as any).author_username ?? c.authorUsername ?? `Korisnik #${authorId}`;
          const createdAt = (c as any).created_at ?? c.createdAt;
          const updatedAt = (c as any).updated_at ?? c.updatedAt;
          const wasEdited = updatedAt && createdAt && updatedAt !== createdAt;
          const isOwner = user?.id === authorId;

          return (
            <div key={c.id} style={{ borderBottom: '1px solid #eee', paddingBottom: 14, marginBottom: 14 }}>
              {editingComment?.id === c.id ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={avatarStyle}>{authorName.charAt(0).toUpperCase()}</div>
                    <strong style={{ fontSize: 14 }}>{authorName}</strong>
                  </div>
                  <textarea rows={2} value={editingComment.text} style={{ width: '100%', marginBottom: 8 }}
                    onChange={e => setEditingComment({ id: c.id, text: e.target.value })} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-primary" style={{ padding: '6px 14px', fontSize: 13 }}
                      onClick={() => saveEdit(c.id, editingComment.text)}>Save</button>
                    <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }}
                      onClick={() => setEditingComment(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={avatarStyle}>{authorName.charAt(0).toUpperCase()}</div>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{authorName}</span>
                      <div style={{ fontSize: 12, color: '#aaa', marginTop: 1 }}>
                        {createdAt ? new Date(createdAt).toLocaleString('sr-RS', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        }) : ''}
                        {wasEdited && (
                          <span style={{
                            marginLeft: 8, fontSize: 11, background: '#f5f5f5',
                            color: '#999', padding: '1px 6px', borderRadius: 10,
                          }}>
                            Edited · {new Date(updatedAt).toLocaleString('sr-RS', {
                              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <p style={{ fontSize: 14, lineHeight: 1.6, color: '#333', paddingLeft: 36 }}>{c.text}</p>
                  {isOwner && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, paddingLeft: 36 }}>
                      <button onClick={() => setEditingComment({ id: c.id, text: c.text })}
                        style={{
                          background: 'none', border: '1px solid #ddd', borderRadius: 5,
                          padding: '3px 10px', fontSize: 12, cursor: 'pointer', color: '#555'
                        }}>
                        Edit
                      </button>
                      <button onClick={() => deleteComment(c.id)}
                        style={{
                          background: 'none', border: '1px solid #f5c2c2', borderRadius: 5,
                          padding: '3px 10px', fontSize: 12, cursor: 'pointer', color: '#dc3545'
                        }}>
                        Delete
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}

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

const avatarStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: '50%',
  background: '#1a1a2e',
  color: 'white',
  fontSize: 13,
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};
