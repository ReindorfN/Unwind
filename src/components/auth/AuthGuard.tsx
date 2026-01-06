import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: ('user' | 'therapist' | 'admin')[];
}

export const AuthGuard = ({ children, allowedRoles }: AuthGuardProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuthStore();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
      return;
    }

    if (!loading && user) {
      // Check if therapist is verified
      if (user.role === 'therapist' && user.therapist && !user.therapist.verified) {
        // Redirect unverified therapists to a pending page or sign them out
        navigate('/unauthorized');
        return;
      }
      
      // Redirect therapists to their dashboard if they try to access regular user routes
      if (user.role === 'therapist' && !location.pathname.startsWith('/therapist') && !location.pathname.startsWith('/forum')) {
        console.log('Redirecting therapist to dashboard');
        // Don't redirect if they're accessing the forum
        if (!location.pathname.startsWith('/forum')) {
          navigate('/therapist/dashboard');
        }
        return;
      }

      // Redirect regular users to home if they try to access therapist routes
      if (user.role === 'user' && location.pathname.startsWith('/therapist')) {
        console.log('Redirecting user to home');
        navigate('/home');
        return;
      }
    }
    // Handle role-based access control
    if (!loading && user && allowedRoles && !allowedRoles.includes(user.role)) {
      navigate('/unauthorized');
    }
  }, [user, loading, navigate, allowedRoles, location.pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!user) return null;
  
  if (allowedRoles && !allowedRoles.includes(user.role)) return null;

  return <>{children}</>;
};