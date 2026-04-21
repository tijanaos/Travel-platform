import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav style={styles.nav}>
      <div style={styles.brand}>
        <Link to="/" style={styles.brandLink}>Travel Platform</Link>
      </div>
      <div style={styles.links}>
        <Link to="/blogs" style={styles.link}>Blogs</Link>
        {isAuthenticated && (
          <>
            <Link to="/tours" style={styles.link}>Tours</Link>
            <Link to="/profile" style={styles.link}>Profile</Link>
            {(user?.role === 'guide') && (
              <Link to="/tours/new" style={styles.link}>New Tour</Link>
            )}
          </>
        )}
        {isAuthenticated ? (
          <button onClick={handleLogout} style={styles.button}>Logout</button>
        ) : (
          <>
            <Link to="/login" style={styles.link}>Login</Link>
            <Link to="/register" style={styles.link}>Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 24px', background: '#1a1a2e', color: 'white' },
  brand: { fontWeight: 'bold', fontSize: '1.2rem' },
  brandLink: { color: 'white', textDecoration: 'none' },
  links: { display: 'flex', gap: '16px', alignItems: 'center' },
  link: { color: '#ccc', textDecoration: 'none' },
  button: { background: 'transparent', border: '1px solid #ccc', color: '#ccc',
    cursor: 'pointer', padding: '4px 12px', borderRadius: '4px' },
};
