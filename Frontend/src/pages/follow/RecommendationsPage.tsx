import { useEffect, useState } from 'react';
import { followerClient, stakeholdersClient } from '../../api/client';

interface UserInfo {
  id: number;
  username: string;
  role: string;
}

function UserCard({ user, isFollowing, onFollow, onUnfollow }: {
  user: UserInfo;
  isFollowing: boolean;
  onFollow: (id: number) => void;
  onUnfollow: (id: number) => void;
}) {
  return (
    <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
      <div>
        <span style={{ fontWeight: 600 }}>@{user.username}</span>
        <span style={{ marginLeft: 8, fontSize: 12, color: '#888' }}>{user.role}</span>
        {isFollowing && (
          <span style={{ marginLeft: 8, fontSize: 12, color: '#667eea', fontWeight: 500 }}>• Following</span>
        )}
      </div>
      {isFollowing ? (
        <button className="btn-secondary" onClick={() => onUnfollow(user.id)}>Unfollow</button>
      ) : (
        <button className="btn-primary" onClick={() => onFollow(user.id)}>Follow</button>
      )}
    </div>
  );
}

async function fetchUserInfo(userId: number): Promise<UserInfo | null> {
  try {
    const res = await stakeholdersClient.get(`/api/users/${userId}`);
    return res.data;
  } catch {
    return null;
  }
}

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<UserInfo[]>([]);
  const [allUsers, setAllUsers] = useState<UserInfo[]>([]);
  const [following, setFollowing] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      followerClient.get('/recommendations'),
      followerClient.get('/discover'),
      followerClient.get('/following'),
    ]).then(async ([recRes, discRes, followingRes]) => {
      const followingSet: Set<number> = new Set(followingRes.data);
      setFollowing(followingSet);

      const allIds: number[] = discRes.data;
      const recIds: number[] = recRes.data;

      const allIdSet = new Set(allIds);
      const uniqueIds = [...new Set([...recIds.filter(id => allIdSet.has(id)), ...allIds])];

      const userInfos = await Promise.all(uniqueIds.map(fetchUserInfo));
      const resolved = userInfos.filter((u): u is UserInfo => u !== null);

      const recIdSet = new Set(recIds);
      setRecommendations(resolved.filter(u => recIdSet.has(u.id)));
      setAllUsers(resolved);
    })
    .catch(() => {})
    .finally(() => setLoading(false));
  }, []);

  async function handleFollow(userId: number) {
    await followerClient.post(`/follow/${userId}`);
    setFollowing(prev => new Set([...prev, userId]));
  }

  async function handleUnfollow(userId: number) {
    await followerClient.delete(`/follow/${userId}`);
    setFollowing(prev => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
  }

  if (loading) return <p>Loading...</p>;

  const recIds = new Set(recommendations.map(u => u.id));
  const otherUsers = allUsers.filter(u => !recIds.has(u.id));

  return (
    <div>
      <h1 className="page-title">Discover People</h1>

      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#444' }}>
        Suggested for you
      </h2>
      {recommendations.length === 0 ? (
        <div className="card" style={{ color: '#888', marginBottom: 24, fontSize: 14 }}>
          No suggestions yet — follow more users to get personalized recommendations.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {recommendations.map(user => (
            <UserCard
              key={user.id}
              user={user}
              isFollowing={following.has(user.id)}
              onFollow={handleFollow}
              onUnfollow={handleUnfollow}
            />
          ))}
        </div>
      )}

      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#444' }}>
        All users
      </h2>
      {otherUsers.length === 0 ? (
        <div className="card" style={{ color: '#888', fontSize: 14 }}>
          {allUsers.length === 0 ? 'No other users yet.' : 'No more users to show.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {otherUsers.map(user => (
            <UserCard
              key={user.id}
              user={user}
              isFollowing={following.has(user.id)}
              onFollow={handleFollow}
              onUnfollow={handleUnfollow}
            />
          ))}
        </div>
      )}
    </div>
  );
}
