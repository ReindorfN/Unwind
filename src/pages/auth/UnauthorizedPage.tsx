import { Link } from 'react-router-dom';
import { Shield, Home } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import Button from '../../components/common/Button';

const UnauthorizedPage = () => {
  const { user, signOut } = useAuthStore();
  
  // Check if this is an unverified therapist
  const isUnverifiedTherapist = user?.role === 'therapist' && user.therapist && !user.therapist.verified;
  
  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-error-100 rounded-full">
            <Shield size={48} className="text-error-500" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-neutral-900 mb-4">
          {isUnverifiedTherapist ? 'Account Pending Verification' : 'Access Denied'}
        </h1>
        <p className="text-neutral-600 mb-8">
          {isUnverifiedTherapist 
            ? 'Your therapist account is currently pending verification. Our team is reviewing your credentials and you will be notified via email once your account is approved.'
            : 'You don\'t have permission to access this page. If you believe this is an error, please contact support.'}
        </p>
        {isUnverifiedTherapist ? (
          <Button variant="primary" onClick={handleSignOut}>
            Sign Out
          </Button>
        ) : (
          <Link to="/">
            <Button variant="primary" icon={<Home size={18} />}>
              Return Home
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
};

export default UnauthorizedPage;