import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { MoodTrackerProvider } from './contexts/MoodTrackerContext';
import { JournalProvider } from './contexts/JournalContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { useAuthStore } from './stores/authStore';
import { useNotifications } from './hooks/useNotifications';
import Layout from './components/layout/Layout';
import TherapistLayout from './components/layout/TherapistLayout';
import AdminLayout from './components/layout/AdminLayout';
import PublicLayout from './components/layout/PublicLayout';
import { AuthGuard } from './components/auth/AuthGuard';
import IndexPage from './pages/IndexPage';
import HomePage from './pages/HomePage';
import ResourceLibrary from './pages/ResourceLibrary';
import EmergencyHelp from './pages/EmergencyHelp';
import MoodTracker from './pages/MoodTracker';
import AppointmentsPage from './pages/AppointmentsPage';
import NotFoundPage from './pages/NotFoundPage';
import LoginPage from './pages/auth/LoginPage';
import SignUpPage from './pages/auth/SignUpPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import UnauthorizedPage from './pages/auth/UnauthorizedPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import JournalingPage from './pages/JournalingPage';
import ForumPage from './pages/ForumPage';
import ForumPostPage from './pages/ForumPostPage';
import CreatePostPage from './pages/CreatePostPage';
import RantCompanionPage from './pages/RantCompanionPage';
import TherapistDashboard from './pages/therapist/TherapistDashboard';
import TherapistAppointments from './pages/therapist/TherapistAppointments';
import TherapistAvailability from './pages/therapist/TherapistAvailability';
import TherapistProfile from './pages/therapist/TherapistProfile';
import AdminDashboard from './pages/admin/AdminDashboard';

// Component to initialize notifications after auth is loaded
const NotificationInitializer = () => {
  const { user } = useAuthStore();
  const notifications = useNotifications();
  const initialized = useRef(false);

  useEffect(() => {
    if (user && !initialized.current) {
      // Initialize notifications for authenticated users
      initialized.current = true;
    }
  }, [user]);

  return null;
};

function App() {
  const { loadUser } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <Router>
      <ThemeProvider>
        <MoodTrackerProvider>
          <JournalProvider>
            <NotificationInitializer />
            <Routes>
              {/* Public routes with public layout */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<IndexPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignUpPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/emergency" element={<EmergencyHelp />} />
                <Route path="/unauthorized" element={<UnauthorizedPage />} />
              </Route>

              {/* Protected routes with authenticated layout */}
              <Route element={<Layout />}>
                <Route path="/home" element={<AuthGuard><HomePage /></AuthGuard>} />
                <Route path="/forum" element={<AuthGuard><ForumPage /></AuthGuard>} />
                <Route path="/forum/post/:postId" element={<AuthGuard><ForumPostPage /></AuthGuard>} />
                <Route path="/forum/create" element={<AuthGuard><CreatePostPage /></AuthGuard>} />
                <Route path="/resources" element={<AuthGuard><ResourceLibrary /></AuthGuard>} />
                <Route path="/mood-tracker" element={<AuthGuard><MoodTracker /></AuthGuard>} />
                <Route path="/appointments" element={<AuthGuard><AppointmentsPage /></AuthGuard>} />
                <Route path="/journal" element={<AuthGuard><JournalingPage /></AuthGuard>} />
                <Route path="/profile" element={<AuthGuard><ProfilePage /></AuthGuard>} />
                <Route path="/settings" element={<AuthGuard><SettingsPage /></AuthGuard>} />
                <Route path="/ai-companion" element={<AuthGuard><RantCompanionPage /></AuthGuard>} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>

              {/* Therapist routes with therapist layout */}
              <Route element={<TherapistLayout />}>
                <Route path="/therapist/dashboard" element={<AuthGuard allowedRoles={['therapist']}><TherapistDashboard /></AuthGuard>} />
                <Route path="/therapist/appointments" element={<AuthGuard allowedRoles={['therapist']}><TherapistAppointments /></AuthGuard>} />
                <Route path="/therapist/availability" element={<AuthGuard allowedRoles={['therapist']}><TherapistAvailability /></AuthGuard>} />
                <Route path="/therapist/profile" element={<AuthGuard allowedRoles={['therapist']}><TherapistProfile /></AuthGuard>} />
                <Route path="/forum" element={<AuthGuard allowedRoles={['therapist']}><ForumPage /></AuthGuard>} />
                <Route path="/forum/post/:postId" element={<AuthGuard allowedRoles={['therapist']}><ForumPostPage /></AuthGuard>} />
                <Route path="/forum/create" element={<AuthGuard allowedRoles={['therapist']}><CreatePostPage /></AuthGuard>} />
              </Route>

              {/* Admin routes with admin layout */}
              <Route element={<AdminLayout />}>
                <Route path="/admin/dashboard" element={<AuthGuard allowedRoles={['admin']}><AdminDashboard /></AuthGuard>} />
              </Route>
            </Routes>
          </JournalProvider>
        </MoodTrackerProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;