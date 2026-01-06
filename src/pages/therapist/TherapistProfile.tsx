import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  User, 
  Save, 
  Camera, 
  Award, 
  Briefcase, 
  GraduationCap, 
  FileText, 
  Clock,
  AlertCircle,
  Check
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import SectionHeading from '../../components/common/SectionHeading';

const therapistProfileSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  bio: z.string().min(10, 'Bio must be at least 10 characters'),
  specialization: z.string().min(2, 'Specialization is required'),
  education: z.string().min(2, 'Education details are required'),
  years_experience: z.number().min(0, 'Years of experience must be 0 or greater'),
  license_number: z.string().min(2, 'License number is required'),
  license_state: z.string().min(2, 'License state is required'),
  session_fee: z.number().min(0, 'Session fee must be 0 or greater'),
  session_length: z.number().min(15, 'Session length must be at least 15 minutes'),
  approaches: z.array(z.string()).min(1, 'Select at least one therapeutic approach'),
  languages: z.array(z.string()).min(1, 'Select at least one language'),
  insurance_accepted: z.boolean().optional(),
  sliding_scale: z.boolean().optional(),
  virtual_sessions: z.boolean().optional(),
  in_person_sessions: z.boolean().optional(),
});

type TherapistProfileForm = z.infer<typeof therapistProfileSchema>;

const TherapistProfile = () => {
  const { user, loadUser } = useAuthStore();
  const [therapistInfo, setTherapistInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<TherapistProfileForm>({
    resolver: zodResolver(therapistProfileSchema),
    defaultValues: {
      full_name: '',
      bio: '',
      specialization: '',
      education: '',
      years_experience: 0,
      license_number: '',
      license_state: '',
      session_fee: 0,
      session_length: 50,
      approaches: [],
      languages: ['English'],
      insurance_accepted: false,
      sliding_scale: false,
      virtual_sessions: true,
      in_person_sessions: false,
    }
  });

  const watchedApproaches = watch('approaches');
  const watchedLanguages = watch('languages');

  useEffect(() => {
    document.title = 'Therapist Profile | Unwind';
    if (user) {
      loadTherapistInfo();
    }
  }, [user]);

  const loadTherapistInfo = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Get therapist profile data
      const { data: therapistData, error: therapistError } = await supabase
        .from('therapists')
        .select('*')
        .eq('id', user.id)
        .single();

      if (therapistError && therapistError.code !== 'PGRST116') {
        throw therapistError;
      }

      // Get therapist application data if available
      const { data: applicationData, error: applicationError } = await supabase
        .from('therapist_applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (applicationError && applicationError.code !== 'PGRST116') {
        throw applicationError;
      }

      // Combine data from both sources
      const combinedData = {
        ...therapistData,
        ...applicationData,
        full_name: user.full_name,
      };

      setTherapistInfo(combinedData);

      // Set form values
      setValue('full_name', user.full_name || '');
      setValue('bio', combinedData?.bio || '');
      setValue('specialization', combinedData?.specialization || '');
      setValue('education', combinedData?.education || '');
      setValue('years_experience', combinedData?.years_experience || 0);
      setValue('license_number', combinedData?.license_number || '');
      setValue('license_state', combinedData?.license_state || '');
      setValue('session_fee', combinedData?.session_fee || 100);
      setValue('session_length', combinedData?.session_length || 50);
      setValue('approaches', combinedData?.approaches || ['Cognitive Behavioral Therapy']);
      setValue('languages', combinedData?.languages || ['English']);
      setValue('insurance_accepted', combinedData?.insurance_accepted || false);
      setValue('sliding_scale', combinedData?.sliding_scale || false);
      setValue('virtual_sessions', combinedData?.virtual_sessions !== false);
      setValue('in_person_sessions', combinedData?.in_person_sessions || false);

    } catch (error) {
      console.error('Error loading therapist info:', error);
      setError('Failed to load your profile information. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setError('');
      const file = event.target.files?.[0];
      if (!file || !user) return;

      // Check if avatars bucket exists first
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      if (bucketsError) throw bucketsError;
      
      const avatarsBucket = buckets.find(bucket => bucket.name === 'avatars');
      if (!avatarsBucket) {
        throw new Error('Storage bucket not configured. Please contact support to enable avatar uploads.');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-avatar.${fileExt}`;
      const filePath = `avatars/${fileName}`;

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
        .eq('id', user.id);

      if (updateError) throw updateError;

      await loadUser();
      setSuccess('Profile photo updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload profile photo. Please try again.';
      setError(errorMessage);
    }
  };

  const onSubmit = async (data: TherapistProfileForm) => {
    if (!user) return;

    try {
      setIsSaving(true);
      setError('');
      setSuccess('');

      // Update profile name
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: data.full_name })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Update therapist info
      const { error: therapistError } = await supabase
        .from('therapists')
        .upsert({
          id: user.id,
          specialization: data.specialization,
          license_number: data.license_number,
          bio: data.bio,
          education: data.education,
          years_experience: data.years_experience,
          session_fee: data.session_fee,
          session_length: data.session_length,
          approaches: data.approaches,
          languages: data.languages,
          insurance_accepted: data.insurance_accepted,
          sliding_scale: data.sliding_scale,
          virtual_sessions: data.virtual_sessions,
          in_person_sessions: data.in_person_sessions,
        });

      if (therapistError) throw therapistError;

      await loadUser();
      setSuccess('Profile updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApproachToggle = (approach: string) => {
    const currentApproaches = watchedApproaches || [];
    if (currentApproaches.includes(approach)) {
      setValue('approaches', currentApproaches.filter(a => a !== approach));
    } else {
      setValue('approaches', [...currentApproaches, approach]);
    }
  };

  const handleLanguageToggle = (language: string) => {
    const currentLanguages = watchedLanguages || [];
    if (currentLanguages.includes(language)) {
      setValue('languages', currentLanguages.filter(l => l !== language));
    } else {
      setValue('languages', [...currentLanguages, language]);
    }
  };

  const therapeuticApproaches = [
    'Cognitive Behavioral Therapy',
    'Psychodynamic Therapy',
    'Humanistic Therapy',
    'Dialectical Behavior Therapy',
    'Mindfulness-Based Therapy',
    'Solution-Focused Therapy',
    'Acceptance and Commitment Therapy',
    'Interpersonal Therapy',
    'Narrative Therapy',
    'Family Systems Therapy',
    'Trauma-Focused Therapy',
    'Motivational Interviewing'
  ];

  const languages = [
    'English',
    'Spanish',
    'French',
    'German',
    'Mandarin',
    'Arabic',
    'Hindi',
    'Portuguese',
    'Russian',
    'Japanese',
    'Korean',
    'Italian'
  ];

  const states = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <SectionHeading
        title="Therapist Profile"
        subtitle="Manage your professional information and credentials"
        className="mb-8"
      />

      {error && (
        <div className="mb-6 p-4 bg-error-50 text-error-700 rounded-lg flex items-center">
          <AlertCircle size={20} className="mr-2" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-success-50 text-success-700 rounded-lg flex items-center">
          <Check size={20} className="mr-2" />
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <form onSubmit={handleSubmit(onSubmit)}>
              {/* Profile Header */}
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
                  <div className="flex items-center">
                    <h2 className="text-xl font-semibold text-neutral-900">{user?.full_name}</h2>
                    {therapistInfo?.verified && (
                      <div className="ml-2 flex items-center bg-primary-50 text-primary-700 px-2 py-1 rounded-full text-xs font-medium">
                        <Award size={12} className="mr-1" />
                        Verified
                      </div>
                    )}
                  </div>
                  <p className="text-neutral-500 capitalize">{user?.role}</p>
                </div>
              </div>

              {/* Basic Information */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <User size={18} className="mr-2 text-primary-500" />
                  Basic Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Full Name *
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
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Specialization *
                    </label>
                    <input
                      {...register('specialization')}
                      type="text"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                    {errors.specialization && (
                      <p className="mt-1 text-sm text-error-600">{errors.specialization.message}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Professional Bio *
                  </label>
                  <textarea
                    {...register('bio')}
                    rows={4}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Describe your approach and experience as a therapist..."
                  />
                  {errors.bio && (
                    <p className="mt-1 text-sm text-error-600">{errors.bio.message}</p>
                  )}
                </div>
              </div>

              {/* Credentials */}
              <div className="mb-6 pt-6 border-t border-neutral-200">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Award size={18} className="mr-2 text-primary-500" />
                  Credentials
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      License Number *
                    </label>
                    <input
                      {...register('license_number')}
                      type="text"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                    {errors.license_number && (
                      <p className="mt-1 text-sm text-error-600">{errors.license_number.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      License State *
                    </label>
                    <select
                      {...register('license_state')}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Select state</option>
                      {states.map((state) => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                    {errors.license_state && (
                      <p className="mt-1 text-sm text-error-600">{errors.license_state.message}</p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Years of Experience *
                    </label>
                    <input
                      {...register('years_experience', { valueAsNumber: true })}
                      type="number"
                      min="0"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                    {errors.years_experience && (
                      <p className="mt-1 text-sm text-error-600">{errors.years_experience.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Education *
                    </label>
                    <input
                      {...register('education')}
                      type="text"
                      placeholder="e.g., Ph.D. in Clinical Psychology, University of California"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                    {errors.education && (
                      <p className="mt-1 text-sm text-error-600">{errors.education.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Session Information */}
              <div className="mb-6 pt-6 border-t border-neutral-200">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Clock size={18} className="mr-2 text-primary-500" />
                  Session Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Session Fee (USD) *
                    </label>
                    <input
                      {...register('session_fee', { valueAsNumber: true })}
                      type="number"
                      min="0"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                    {errors.session_fee && (
                      <p className="mt-1 text-sm text-error-600">{errors.session_fee.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Session Length (minutes) *
                    </label>
                    <select
                      {...register('session_length', { valueAsNumber: true })}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value={30}>30 minutes</option>
                      <option value={45}>45 minutes</option>
                      <option value={50}>50 minutes</option>
                      <option value={60}>60 minutes</option>
                      <option value={90}>90 minutes</option>
                    </select>
                    {errors.session_length && (
                      <p className="mt-1 text-sm text-error-600">{errors.session_length.message}</p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="flex items-center">
                      <input
                        {...register('insurance_accepted')}
                        type="checkbox"
                        className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500 mr-2"
                      />
                      <span className="text-neutral-700">Accept Insurance</span>
                    </label>
                  </div>
                  
                  <div>
                    <label className="flex items-center">
                      <input
                        {...register('sliding_scale')}
                        type="checkbox"
                        className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500 mr-2"
                      />
                      <span className="text-neutral-700">Offer Sliding Scale</span>
                    </label>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center">
                      <input
                        {...register('virtual_sessions')}
                        type="checkbox"
                        className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500 mr-2"
                      />
                      <span className="text-neutral-700">Offer Virtual Sessions</span>
                    </label>
                  </div>
                  
                  <div>
                    <label className="flex items-center">
                      <input
                        {...register('in_person_sessions')}
                        type="checkbox"
                        className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500 mr-2"
                      />
                      <span className="text-neutral-700">Offer In-Person Sessions</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Therapeutic Approaches */}
              <div className="mb-6 pt-6 border-t border-neutral-200">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Briefcase size={18} className="mr-2 text-primary-500" />
                  Therapeutic Approaches *
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {therapeuticApproaches.map((approach) => (
                    <label key={approach} className="flex items-center p-2 border border-neutral-200 rounded-md hover:bg-neutral-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={watchedApproaches?.includes(approach)}
                        onChange={() => handleApproachToggle(approach)}
                        className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500 mr-2"
                      />
                      <span className="text-sm text-neutral-700">{approach}</span>
                    </label>
                  ))}
                </div>
                {errors.approaches && (
                  <p className="mt-2 text-sm text-error-600">{errors.approaches.message}</p>
                )}
              </div>

              {/* Languages */}
              <div className="mb-6 pt-6 border-t border-neutral-200">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <GraduationCap size={18} className="mr-2 text-primary-500" />
                  Languages *
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {languages.map((language) => (
                    <label key={language} className="flex items-center p-2 border border-neutral-200 rounded-md hover:bg-neutral-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={watchedLanguages?.includes(language)}
                        onChange={() => handleLanguageToggle(language)}
                        className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500 mr-2"
                      />
                      <span className="text-sm text-neutral-700">{language}</span>
                    </label>
                  ))}
                </div>
                {errors.languages && (
                  <p className="mt-2 text-sm text-error-600">{errors.languages.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-6 border-t border-neutral-200">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSaving}
                  icon={<Save size={18} />}
                >
                  {isSaving ? 'Saving...' : 'Save Profile'}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Sidebar */}
        <div>
          <Card className="sticky top-6">
            <h3 className="text-lg font-semibold mb-4">Profile Visibility</h3>
            <div className="p-4 bg-primary-50 rounded-lg mb-6">
              <div className="flex items-center mb-2">
                <FileText className="text-primary-600 mr-2" size={18} />
                <h4 className="font-medium text-primary-800">Profile Completeness</h4>
              </div>
              <div className="w-full bg-white rounded-full h-2.5 mb-2">
                <div className="bg-primary-500 h-2.5 rounded-full" style={{ width: '85%' }}></div>
              </div>
              <p className="text-sm text-primary-700">
                Your profile is 85% complete. Add more details to improve visibility.
              </p>
            </div>

            <div className="space-y-4 text-sm text-neutral-600">
              <div>
                <h4 className="font-medium text-neutral-900 mb-1">Profile Tips</h4>
                <ul className="space-y-1">
                  <li>• Add a professional photo to build trust</li>
                  <li>• Be specific about your specializations</li>
                  <li>• Highlight your unique approach</li>
                  <li>• Keep your availability up to date</li>
                  <li>• Regularly update your credentials</li>
                </ul>
              </div>
              
              <div className="pt-4 border-t border-neutral-200">
                <h4 className="font-medium text-neutral-900 mb-1">Verification Status</h4>
                {therapistInfo?.verified ? (
                  <div className="flex items-center text-success-600">
                    <Check size={16} className="mr-1" />
                    <span>Your account is verified</span>
                  </div>
                ) : (
                  <div className="flex items-center text-warning-600">
                    <AlertCircle size={16} className="mr-1" />
                    <span>Verification pending</span>
                  </div>
                )}
                <p className="mt-2 text-neutral-600">
                  {therapistInfo?.verified 
                    ? 'Your credentials have been verified. You have full access to all therapist features.'
                    : 'Your application is being reviewed. You\'ll be notified once verification is complete.'}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TherapistProfile;