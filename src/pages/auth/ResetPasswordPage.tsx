import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, AlertCircle, Check, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Button from '../../components/common/Button';
import Logo from '../../components/common/Logo';

const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

const ResetPasswordPage = ({ isOpen, onClose }: ResetPasswordModalProps) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(true);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  });

  useEffect(() => {
    const checkToken = async () => {
      try {
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');

        if (!accessToken || !refreshToken) {
          setError('Invalid or missing reset token. Please request a new password reset link.');
          setIsCheckingToken(false);
          return;
        }

        // Set the session with the tokens from the URL
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          setError('Invalid or expired reset token. Please request a new password reset link.');
        } else {
          setIsValidToken(true);
        }
      } catch (err) {
        setError('An error occurred while verifying the reset token.');
      } finally {
        setIsCheckingToken(false);
      }
    };

    checkToken();
  }, [searchParams]);

  const onSubmit = async (data: ResetPasswordForm) => {
    try {
      setError('');

      const { error } = await supabase.auth.updateUser({
        password: data.password
      });

      if (error) throw error;

      setIsSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please try again.');
    }
  };

  if (!isOpen) {
    return null;
  }

  if (isCheckingToken) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-soft text-center">
          <div className="flex justify-end">
            <button 
              onClick={onClose} 
              className="p-1 rounded-full hover:bg-neutral-100 transition-colors"
              aria-label="Close"
            >
              <X size={20} className="text-neutral-500" />
            </button>
          </div>
          <div className="flex justify-center">
            <Logo size={48} />
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
          <p className="text-neutral-600">Verifying reset token...</p>
        </div>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-soft text-center">
          <div className="flex justify-end">
            <button 
              onClick={onClose} 
              className="p-1 rounded-full hover:bg-neutral-100 transition-colors"
              aria-label="Close"
            >
              <X size={20} className="text-neutral-500" />
            </button>
          </div>
          <div className="flex justify-center">
            <Logo size={48} />
          </div>
          <div className="w-16 h-16 bg-error-100 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="text-error-600" size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">Invalid Reset Link</h2>
            <p className="text-neutral-600 mb-6">{error}</p>
            <Button
              variant="primary"
              onClick={() => navigate('/login')}
              fullWidth
            >
              Back to Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-soft text-center">
          <div className="flex justify-end">
            <button 
              onClick={onClose} 
              className="p-1 rounded-full hover:bg-neutral-100 transition-colors"
              aria-label="Close"
            >
              <X size={20} className="text-neutral-500" />
            </button>
          </div>
          <div className="flex justify-center">
            <Logo size={48} />
          </div>
          <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto">
            <Check className="text-success-600" size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">Password Reset Successful</h2>
            <p className="text-neutral-600 mb-6">
              Your password has been successfully reset. You will be redirected to the sign-in page shortly.
            </p>
            <Button
              variant="primary"
              onClick={() => navigate('/login')}
              fullWidth
            >
              Continue to Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-soft">
        <div className="flex justify-end">
          <button 
            onClick={onClose} 
            className="p-1 rounded-full hover:bg-neutral-100 transition-colors"
            aria-label="Close"
          >
            <X size={20} className="text-neutral-500" />
          </button>
        </div>
        <div className="text-center">
          <div className="flex justify-center">
            <Logo size={48} />
          </div>
          <h2 className="mt-4 text-3xl font-bold text-neutral-900">Reset Your Password</h2>
          <p className="mt-2 text-sm text-neutral-600">
            Enter your new password below
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {error && (
            <div className="bg-error-50 text-error-700 p-3 rounded-md text-sm flex items-center">
              <AlertCircle size={18} className="mr-2" />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-700">
                New Password
              </label>
              <input
                {...register('password')}
                type="password"
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                placeholder="Enter your new password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-error-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700">
                Confirm New Password
              </label>
              <input
                {...register('confirmPassword')}
                type="password"
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                placeholder="Confirm your new password"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-error-600">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={isSubmitting}
            icon={<Lock size={18} />}
          >
            {isSubmitting ? 'Resetting Password...' : 'Reset Password'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;