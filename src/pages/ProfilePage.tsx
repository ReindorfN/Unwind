import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Bell, Lock, Save, Camera } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import Button from '../components/common/Button';
import Card from '../components/common/Card';

const profileSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  notification_preferences: z.object({
    email: z.boolean(),
    push: z.boolean(),
  }),
  privacy_settings: z.object({
    profile_visible: z.boolean(),
  }),
});

type ProfileForm = z.infer<typeof profileSchema>;

const ProfilePage = () => {
  const { user, loadUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: user?.full_name || '',
      notification_preferences: {
        email: true,
        push: true,
      },
      privacy_settings: {
        profile_visible: true,
      },
    },
  });

  useEffect(() => {
    document.title = 'Profile | Unwind';
  }, []);

  const onSubmit = async (data: ProfileForm) => {
    try {
      setIsLoading(true);
      setError('');
      setSuccessMessage('');

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: data.full_name })
        .eq('id', user?.id);

      if (profileError) throw profileError;

      // Update user settings
      const { error: settingsError } = await supabase
        .from('user_settings')
        .update({
          notification_preferences: data.notification_preferences,
          privacy_settings: data.privacy_settings,
        })
        .eq('user_id', user?.id);

      if (settingsError) throw settingsError;

      await loadUser();
      setSuccessMessage('Profile updated successfully');
    } catch (err) {
      setError('Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setError('');
      const file = event.target.files?.[0];
      if (!file) return;

      // Check if avatars bucket exists first
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      if (bucketsError) throw bucketsError;
      
      const avatarsBucket = 'avatars'; 
      if (!avatarsBucket) {
        throw new Error('Storage bucket not configured. Please contact support to enable avatar uploads.');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-avatar.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload image
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      await loadUser();
      setSuccessMessage('Avatar updated successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload avatar. Please try again.';
      setError(errorMessage);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-neutral-900 mb-8">Profile Settings</h1>

        {error && (
          <div className="mb-4 p-4 bg-error-50 text-error-700 rounded-md">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-4 bg-success-50 text-success-700 rounded-md">
            {successMessage}
          </div>
        )}

        <div className="space-y-6">
          <Card>
            <div className="flex items-center space-x-4 mb-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-neutral-100 flex items-center justify-center overflow-hidden">
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.full_name || 'Profile'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={40} className="text-neutral-400" />
                  )}
                </div>
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 p-1 bg-white rounded-full shadow-md cursor-pointer hover:bg-neutral-50 transition-colors"
                >
                  <Camera size={16} className="text-neutral-600" />
                  <input
                    type="file"
                    id="avatar-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                  />
                </label>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-neutral-900">{user?.full_name}</h2>
                <p className="text-neutral-500 capitalize">{user?.role}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Full Name
                </label>
                <input
                  {...register('full_name')}
                  type="text"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
                {errors.full_name && (
                  <p className="mt-1 text-sm text-error-600">{errors.full_name.message}</p>
                )}
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-neutral-900 mb-4 flex items-center">
                  <Bell size={20} className="mr-2" />
                  Notification Preferences
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      {...register('notification_preferences.email')}
                      type="checkbox"
                      className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-neutral-700">Email notifications</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      {...register('notification_preferences.push')}
                      type="checkbox"
                      className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-neutral-700">Push notifications</span>
                  </label>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-neutral-900 mb-4 flex items-center">
                  <Lock size={20} className="mr-2" />
                  Privacy Settings
                </h3>
                <label className="flex items-center">
                  <input
                    {...register('privacy_settings.profile_visible')}
                    type="checkbox"
                    className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-neutral-700">Make profile visible to others</span>
                </label>
              </div>

              <div className="flex justify-end pt-6">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isLoading}
                  icon={<Save size={18} />}
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;