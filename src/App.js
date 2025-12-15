import React, { useEffect, useCallback, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Loading from './components/Loading';

// Eager load login pages (entry points)
import LoginPage from './pages/LoginPage';
import OfficerLoginPage from './pages/OfficerLoginPage';

// Auth guards (small, load eagerly)
import UserAuthGuard from './components/UserAuthGuard';
import OfficerAuthGuard from './components/OfficerAuthGuard';

// Lazy load all protected pages for code splitting
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const EventsPage = lazy(() => import('./pages/EventsPage'));
const AnnouncementsPage = lazy(() => import('./pages/AnnouncementsPage'));
const MembershipPage = lazy(() => import('./pages/MembershipPage'));
const ECertificatesPage = lazy(() => import('./pages/ECertificatesPage'));
const OfficerDashboardPage = lazy(() => import('./pages/OfficerDashboardPage'));
const OfficerManageEventsPage = lazy(() => import('./pages/OfficerManageEventsPage'));
const OfficerManageAnnouncementsPage = lazy(() => import('./pages/OfficerManageAnnouncementsPage'));
const OfficerManageMembershipPage = lazy(() => import('./pages/OfficerManageMembershipPage'));
const OfficerCashPaymentVerificationPage = lazy(() => import('./pages/OfficerCashPaymentVerificationPage'));
const AdminManageOfficerPage = lazy(() => import('./pages/AdminManageOfficerPage'));

const safeDecodeJwtPayload = (jwt) => {
  if (!jwt || typeof jwt !== 'string') return null;
  const parts = jwt.split('.');
  if (parts.length < 2) return null;
  try {
    return JSON.parse(atob(parts[1]));
  } catch {
    return null;
  }
};

function App() {
  const isDev = process.env.NODE_ENV !== 'production';

  const checkAuth = useCallback(() => {
    try {
      const storedToken = localStorage.getItem('access_token');
      const storedUserId = localStorage.getItem('user_id');
      if (storedToken && storedUserId) {
        // Basic token expiration check (decode JWT)
        const payload = safeDecodeJwtPayload(storedToken);
        const expiry = payload?.exp ? payload.exp * 1000 : null;
        if (!expiry) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('user_id');
          return;
        }
        if (Date.now() > expiry) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('user_id');
          return;
        }
        if (isDev) {
          console.debug('Loaded credentials from storage');
        }
      } else {
        if (isDev) {
          console.debug('No stored credentials');
        }
      }
    } catch (error) {
      if (isDev) {
        console.error('Authentication check failed:', error);
      }
    }
  }, [isDev]);

  useEffect(() => {
    checkAuth();
    const handleStorageChange = () => {
      checkAuth();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [checkAuth]);

  const handleLogin = useCallback((newToken, newUserId) => {
    localStorage.setItem('access_token', newToken);
    localStorage.setItem('user_id', newUserId);
    if (isDev) {
      console.debug('Login successful');
    }
  }, [isDev]);

  return (
    <Router>
      <Suspense fallback={<Loading message="Loading..." />}>
        <Routes>
          <Route path="/" element={<LoginPage onLogin={handleLogin} />} />
          <Route path="/officer-login" element={<OfficerLoginPage />} />
          <Route
            path="/dashboard"
            element={
              <UserAuthGuard>
                <DashboardPage />
              </UserAuthGuard>
            }
          />
          <Route
            path="/profile"
            element={
              <UserAuthGuard>
                <ProfilePage />
              </UserAuthGuard>
            }
          />
          <Route
            path="/events"
            element={
              <UserAuthGuard>
                <EventsPage />
              </UserAuthGuard>
            }
          />
          <Route
            path="/announcements"
            element={
              <UserAuthGuard>
                <AnnouncementsPage />
              </UserAuthGuard>
            }
          />
          <Route
            path="/membership"
            element={
              <UserAuthGuard>
                <MembershipPage />
              </UserAuthGuard>
            }
          />
          <Route
            path="/certificates"
            element={
              <UserAuthGuard>
                <ECertificatesPage />
              </UserAuthGuard>
            }
          />
          <Route
            path="/officer-dashboard"
            element={
              <OfficerAuthGuard>
                <OfficerDashboardPage />
              </OfficerAuthGuard>
            }
          />
          <Route
            path="/officer-manage-events"
            element={
              <OfficerAuthGuard>
                <OfficerManageEventsPage />
              </OfficerAuthGuard>
            }
          />
          <Route
            path="/officer-manage-announcements"
            element={
              <OfficerAuthGuard>
                <OfficerManageAnnouncementsPage />
              </OfficerAuthGuard>
            }
          />
          <Route
            path="/officer-manage-membership"
            element={
              <OfficerAuthGuard>
                <OfficerManageMembershipPage />
              </OfficerAuthGuard>
            }
          />
          <Route
            path="/officer-cash-verification"
            element={
              <OfficerAuthGuard>
                <OfficerCashPaymentVerificationPage />
              </OfficerAuthGuard>
            }
          />
          <Route
            path="/admin-manage-officers"
            element={
              <OfficerAuthGuard>
                <AdminManageOfficerPage />
              </OfficerAuthGuard>
            }
          />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;