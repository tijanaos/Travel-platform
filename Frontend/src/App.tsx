import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';

import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ProfilePage from './pages/auth/ProfilePage';

import BlogListPage from './pages/blog/BlogListPage';
import BlogDetailPage from './pages/blog/BlogDetailPage';
import BlogCreatePage from './pages/blog/BlogCreatePage';
import FeedPage from './pages/blog/FeedPage';
import RecommendationsPage from './pages/follow/RecommendationsPage';

import TourListPage from './pages/tours/TourListPage';
import TourDetailPage from './pages/tours/TourDetailPage';
import TourCreatePage from './pages/tours/TourCreatePage';
import MyToursPage from './pages/tours/MyToursPage';
import SimulatorPage from './pages/tours/SimulatorPage';

import AdminPage from './pages/admin/AdminPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function AppRoutes() {
  return (
    <>
      <Navbar />
      <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
        <Routes>
          <Route path="/" element={<Navigate to="/blogs" />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/blogs" element={<BlogListPage />} />
          <Route path="/blogs/new" element={<ProtectedRoute><BlogCreatePage /></ProtectedRoute>} />
          <Route path="/blogs/:id" element={<BlogDetailPage />} />
          <Route path="/tours" element={<ProtectedRoute><TourListPage /></ProtectedRoute>} />
          <Route path="/tours/new" element={<ProtectedRoute><TourCreatePage /></ProtectedRoute>} />
          <Route path="/tours/my" element={<ProtectedRoute><MyToursPage /></ProtectedRoute>} />
          <Route path="/tours/:id" element={<ProtectedRoute><TourDetailPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/feed" element={<ProtectedRoute><FeedPage /></ProtectedRoute>} />
          <Route path="/recommendations" element={<ProtectedRoute><RecommendationsPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
          <Route path="/simulator" element={<ProtectedRoute><SimulatorPage /></ProtectedRoute>} />
        </Routes>
      </div>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
