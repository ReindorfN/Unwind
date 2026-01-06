import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus, Upload, X, Check, AlertCircle, Stethoscope } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import Button from '../../components/common/Button';
import Logo from '../../components/common/Logo';

// Regular user signup schema
const userSignUpSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Therapist application schema
const therapistApplicationSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  specialization: z.string().min(2, 'Specialization is required'),
  licenseNumber: z.string().min(3, 'License number is required'),
  licenseState: z.string().min(2, 'License state is required'),
  yearsExperience: z.number().min(0, 'Years of experience must be 0 or greater'),
  education: z.string().min(10, 'Education details are required'),
  certifications: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type UserSignUpForm = z.infer<typeof userSignUpSchema>;
type TherapistApplicationForm = z.infer<typeof therapistApplicationSchema>;

const EmailVerificationModal = ({ 
  isOpen, 
  onClose, 
  isTherapist = false 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  isTherapist?: boolean;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="text-primary-600" size={32} />
          </div>
          <h3 className="text-xl font-semibold text-neutral-900 mb-2">
            {isTherapist ? 'Application Submitted' : 'Check Your Email'}
          </h3>
          <p className="text-neutral-600 mb-6">
            {isTherapist 
              ? 'Your therapist application has been submitted for review. You will receive an email notification once your credentials have been verified and your account is approved. This process typically takes 1-3 business days.'
              : 'We\'ve sent you a verification link. Please check your email and click the link to verify your account before signing in.'
            }
          </p>
          <Button variant="primary" onClick={onClose} fullWidth>
            {isTherapist ? 'Understood' : 'Got it'}
          </Button>
        </div>
      </div>
    </div>
  );
};

const TherapistApplicationModal = ({ 
  isOpen, 
  onClose, 
  onSuccess 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<TherapistApplicationForm>({
    resolver: zodResolver(therapistApplicationSchema),
    defaultValues: {
      yearsExperience: 0,
    }
  });

  const specializations = [
    'Clinical Psychology',
    'Counseling Psychology',
    'Marriage and Family Therapy',
    'Licensed Clinical Social Worker',
    'Licensed Professional Counselor',
    'Psychiatry',
    'Addiction Counseling',
    'Child and Adolescent Therapy',
    'Trauma Therapy',
    'Cognitive Behavioral Therapy',
    'Other'
  ];

  const countries = [
    'AF', 'AL', 'DZ', 'AD', 'AO', 'AG', 'AR', 'AM', 'AU', 'AT', 'AZ', 'BS', 'BH', 'BD', 'BB',
    'BY', 'BE', 'BZ', 'BJ', 'BT', 'BO', 'BA', 'BW', 'BR', 'BN', 'BG', 'BF', 'BI', 'CV', 'KH',
    'CM', 'CA', 'CF', 'TD', 'CL', 'CN', 'CO', 'KM', 'CG', 'CD', 'CR', 'CI', 'HR', 'CU', 'CY',
    'CZ', 'DK', 'DJ', 'DM', 'DO', 'EC', 'EG', 'SV', 'GQ', 'ER', 'EE', 'SZ', 'ET', 'FJ', 'FI',
    'FR', 'GA', 'GM', 'GE', 'DE', 'GH', 'GR', 'GD', 'GT', 'GN', 'GW', 'GY', 'HT', 'HN', 'HU',
    'IS', 'IN', 'ID', 'IR', 'IQ', 'IE', 'IL', 'IT', 'JM', 'JP', 'JO', 'KZ', 'KE', 'KI', 'KP',
    'KR', 'KW', 'KG', 'LA', 'LV', 'LB', 'LS', 'LR', 'LY', 'LI', 'LT', 'LU', 'MG', 'MW', 'MY',
    'MV', 'ML', 'MT', 'MH', 'MR', 'MU', 'MX', 'FM', 'MD', 'MC', 'MN', 'ME', 'MA', 'MZ', 'MM',
    'NA', 'NR', 'NP', 'NL', 'NZ', 'NI', 'NE', 'NG', 'MK', 'NO', 'OM', 'PK', 'PW', 'PA', 'PG',
    'PY', 'PE', 'PH', 'PL', 'PT', 'QA', 'RO', 'RU', 'RW', 'KN', 'LC', 'VC', 'WS', 'SM', 'ST',
    'SA', 'SN', 'RS', 'SC', 'SL', 'SG', 'SK', 'SI', 'SB', 'SO', 'ZA', 'SS', 'ES', 'LK', 'SD',
    'SR', 'SE', 'CH', 'SY', 'TJ', 'TZ', 'TH', 'TL', 'TG', 'TO', 'TT', 'TN', 'TR', 'TM', 'TV',
    'UG', 'UA', 'AE', 'GB', 'US', 'UY', 'UZ', 'VU', 'VA', 'VE', 'VN', 'YE', 'ZM', 'ZW'
  ];

  const handleCertificateUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please upload a valid image (JPG, PNG) or PDF file');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      
      setCertificateFile(file);
      setError('');
    }
  };

  const uploadCertificate = async (userId: string): Promise<string | null> => {
    if (!certificateFile) return null;

    try {
      // First, try to create the bucket if it doesn't exist
      const { error: bucketError } = await supabase.storage.createBucket('certificates', {
        public: false,
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
        fileSizeLimit: 5242880 // 5MB
      });
      
      // Ignore error if bucket already exists
      if (bucketError && !bucketError.message.includes('already exists')) {
        console.warn('Could not create certificates bucket:', bucketError);
      }

      const fileExt = certificateFile.name.split('.').pop();
      const fileName = `${userId}-certificate-${Date.now()}.${fileExt}`;
      const filePath = `therapist-certificates/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('certificates')
        .upload(filePath, certificateFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('certificates')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading certificate:', error);
      // Don't fail the entire application if certificate upload fails
      throw new Error('Certificate upload failed. Please try again or submit without a certificate.');
    }
  };


const handleTherapistSignup = async (data: TherapistApplicationForm) => {
  try {
    setError('');
    
    // Step 1: Sign up with Supabase Auth
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          role: 'therapist', // stored in raw_user_meta_data
        },
      },
    });

    if (signUpError) throw signUpError;

    const user = signUpData.user;

    if (!user) {
      setError('User creation failed.');
      return;
    }

    // Step 2: Call RPC to store therapist-specific metadata
    const { error: rpcError } = await supabase.rpc('submit_therapist_metadata', {
      user_id: user.id,
      specialization: data.specialization,
      license_number: data.licenseNumber,
      license_state: data.licenseState,
      years_experience: data.yearsExperience,
      education: data.education,
      certifications: data.certifications || [],
      certificate_image_url: data.certificateImageUrl || null,
    });

    if (rpcError) throw rpcError;

    onSuccess('Your application has been submitted. Please verify your email to proceed.');

  } catch (err: any) {
    setError(err.message || 'Something went wrong.');
  }
};



  // const onSubmit = async (data: TherapistApplicationForm) => {
  //   try {
  //     setError('');

  //     // Upload certificate first if provided
  //     let certificateUrl = null;
  //     if (certificateFile) {
  //       try {
  //         // Create a temporary URL for the file
  //         const fileExt = certificateFile.name.split('.').pop();
  //         const fileName = `temp-certificate-${Date.now()}.${fileExt}`;
          
  //         // Upload to temporary storage
  //         const { data: uploadData, error: uploadError } = await supabase.storage
  //           .from('temp')
  //           .upload(fileName, certificateFile);
            
  //         if (uploadError) throw uploadError;
          
  //         // Get the public URL
  //         const { data: { publicUrl } } = supabase.storage
  //           .from('temp')
  //           .getPublicUrl(fileName);
            
  //         certificateUrl = publicUrl;
  //       } catch (uploadError) {
  //         console.error('Certificate upload error:', uploadError);
  //         // Continue without certificate if upload fails
  //       }
  //     }
      
  //     // Use the frontend function to create user and application in one step
  //     const { data: applicationData, error: applicationError } = await supabase.rpc(
  //       'apply_for_therapist_role_frontend',
  //       {
  //         email: data.email,
  //         password: data.password,
  //         full_name: data.fullName,
  //         specialization: data.specialization,
  //         license_number: data.licenseNumber,
  //         license_state: data.licenseState,
  //         years_experience: data.yearsExperience,
  //         education: data.education,
  //         certifications: data.certifications ? data.certifications.split(',').map(c => c.trim()) : [],
  //         certificate_image_url: certificateUrl
  //       }
  //     );
      
  //     if (applicationError || !applicationData.success) {
  //       console.error('Application error:', applicationError || applicationData.error);
        
  //       // Handle specific error cases
  //       const errorMessage = applicationError?.message || applicationData?.message || '';
        
  //       if (errorMessage.includes('duplicate key value violates unique constraint "profiles_pkey"')) {
  //         throw new Error('An account with this email already exists. Please use a different email or sign in to your existing account.');
  //       } else if (errorMessage.includes('duplicate key')) {
  //         throw new Error('This email is already registered. Please use a different email address.');
  //       } else if (errorMessage.includes('User already registered')) {
  //         throw new Error('An account with this email already exists. Please sign in instead.');
  //       } else if (errorMessage.includes('already registered') || errorMessage.includes('already exists')) {
  //         throw new Error('An account with this email already exists. Please use a different email or sign in to your existing account.');
  //       } else {
  //         throw new Error(errorMessage || 'Failed to submit therapist application. Please try again.');
  //       }
  //     }

  //     // Sign out the user immediately
  //     await supabase.auth.signOut();

  //     // Reset form and close modal
  //     reset();
  //     setCertificateFile(null);
  //     onClose();
  //     onSuccess();

  //   } catch (err: any) {
  //     console.error('Therapist application error:', err);
      
  //     // Provide more specific error messages
  //     if (err.message?.includes('An account with this email already exists')) {
  //       setError(err.message);
  //     } else if (err.message?.includes('This email is already registered')) {
  //       setError(err.message);
  //     } else if (err.message?.includes('User already registered')) {
  //       setError(err.message);
  //     } else if (err.message?.includes('Certificate upload failed')) {
  //       setError(err.message);
  //     } else if (err.message?.includes('Bucket not found')) {
  //       setError('File upload is temporarily unavailable. Please try submitting without a certificate or contact support.');
  //     } else if (err.message?.includes('duplicate key')) {
  //       setError('This email is already registered. Please use a different email address or sign in to your existing account.');
  //     } else {
  //       setError(err.message || 'Error submitting application. Please try again.');
  //     }
  //   }
  // };

  const handleClose = () => {
    reset();
    setCertificateFile(null);
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full my-8">
        <div className="p-6 border-b border-neutral-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                <Stethoscope className="text-primary-600" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-neutral-900">Therapist Application</h2>
                <p className="text-sm text-neutral-600">Join as a verified mental health professional</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <form onSubmit={handleSubmit(handleTherapistSignup)} className="space-y-6">
            {error && (
              <div className="bg-error-50 text-error-700 p-3 rounded-md text-sm flex items-center">
                <AlertCircle size={18} className="mr-2" />
                {error}
              </div>
            )}

            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    {...register('fullName')}
                    type="text"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  />
                  {errors.fullName && (
                    <p className="mt-1 text-sm text-error-600">{errors.fullName.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Email *
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-error-600">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Password *
                  </label>
                  <input
                    {...register('password')}
                    type="password"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-error-600">{errors.password.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Confirm Password *
                  </label>
                  <input
                    {...register('confirmPassword')}
                    type="password"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-error-600">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">Professional Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Specialization *
                  </label>
                  <select
                    {...register('specialization')}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select specialization</option>
                    {specializations.map((spec) => (
                      <option key={spec} value={spec}>{spec}</option>
                    ))}
                  </select>
                  {errors.specialization && (
                    <p className="mt-1 text-sm text-error-600">{errors.specialization.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Years of Experience *
                  </label>
                  <input
                    {...register('yearsExperience', { valueAsNumber: true })}
                    type="number"
                    min="0"
                    max="50"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  />
                  {errors.yearsExperience && (
                    <p className="mt-1 text-sm text-error-600">{errors.yearsExperience.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    License Number *
                  </label>
                  <input
                    {...register('licenseNumber')}
                    type="text"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  />
                  {errors.licenseNumber && (
                    <p className="mt-1 text-sm text-error-600">{errors.licenseNumber.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    License Country *
                  </label>
                  <select
                    {...register('licenseState')}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select country</option>
                    {countries.map((country) => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                  {errors.licenseState && (
                    <p className="mt-1 text-sm text-error-600">{errors.licenseState.message}</p>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Education & Degrees *
                </label>
                <textarea
                  {...register('education')}
                  rows={3}
                  placeholder="e.g., Ph.D. in Clinical Psychology from University of California, Berkeley (2015)"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
                {errors.education && (
                  <p className="mt-1 text-sm text-error-600">{errors.education.message}</p>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Additional Certifications (Optional)
                </label>
                <input
                  {...register('certifications')}
                  type="text"
                  placeholder="e.g., EMDR, CBT, DBT (comma-separated)"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Certificate Upload */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  License Certificate (Optional)
                </label>
                <div className="border-2 border-dashed border-neutral-300 rounded-lg p-4">
                  {certificateFile ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                          <Check className="text-primary-600" size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-neutral-900">{certificateFile.name}</p>
                          <p className="text-xs text-neutral-500">
                            {(certificateFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCertificateFile(null)}
                        className="text-neutral-400 hover:text-error-500 transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="mx-auto h-8 w-8 text-neutral-400 mb-2" />
                      <label htmlFor="certificate-upload" className="cursor-pointer">
                        <span className="text-sm font-medium text-primary-600 hover:text-primary-500">
                          Upload certificate
                        </span>
                        <span className="text-sm text-neutral-500"> or drag and drop</span>
                      </label>
                      <p className="text-xs text-neutral-500 mt-1">PNG, JPG, PDF up to 5MB</p>
                      <input
                        id="certificate-upload"
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf"
                        onChange={handleCertificateUpload}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-primary-50 p-4 rounded-md">
              <p className="text-sm text-primary-800">
                <strong>Important:</strong> Your application will be reviewed by our team. You'll receive an email notification once your credentials are verified and your account is approved. This process typically takes 1-3 business days.
              </p>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-neutral-200 flex space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            onClick={handleSubmit(handleTherapistSignup)}
            className="flex-1"
            icon={<Stethoscope size={18} />}
          >
            {isSubmitting ? 'Submitting Application...' : 'Submit Application'}
          </Button>
        </div>
      </div>
    </div>
  );
};

const SignUpPage = () => {
  const navigate = useNavigate();
  const { signUp } = useAuthStore();
  const [error, setError] = useState('');
  const [showTherapistModal, setShowTherapistModal] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [isTherapistSignup, setIsTherapistSignup] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<UserSignUpForm>({
    resolver: zodResolver(userSignUpSchema),
  });

  const onSubmit = async (data: UserSignUpForm) => {
    try {
      setError('');
      await signUp(data.email, data.password, data.fullName);
      setIsTherapistSignup(false);
      setShowEmailVerification(true);
    } catch (err: any) {
      console.error('User signup error:', err);
      setError(err.message || 'Error creating account. Please try again.');
    }
  };

  const handleTherapistSuccess = () => {
    setIsTherapistSignup(true);
    setShowEmailVerification(true);
  };

  const handleEmailVerificationClose = () => {
    setShowEmailVerification(false);
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-soft">
        <div className="text-center">
          <div className="flex justify-center">
            <Logo size={48} />
          </div>
          <h2 className="mt-4 text-3xl font-bold text-neutral-900">Create an account</h2>
          <p className="mt-2 text-sm text-neutral-600">
            Start your mental wellness journey today
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
              <label htmlFor="fullName" className="block text-sm font-medium text-neutral-700">
                Full Name *
              </label>
              <input
                {...register('fullName')}
                type="text"
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
              {errors.fullName && (
                <p className="mt-1 text-sm text-error-600">{errors.fullName.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
                Email *
              </label>
              <input
                {...register('email')}
                type="email"
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-error-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-700">
                Password *
              </label>
              <input
                {...register('password')}
                type="password"
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-error-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700">
                Confirm Password *
              </label>
              <input
                {...register('confirmPassword')}
                type="password"
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-error-600">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col space-y-4">
            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={isSubmitting}
              icon={<UserPlus size={18} />}
            >
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </Button>

            <div className="relative flex items-center">
              <div className="flex-grow border-t border-neutral-200"></div>
              <span className="flex-shrink mx-4 text-neutral-400 text-sm">or</span>
              <div className="flex-grow border-t border-neutral-200"></div>
            </div>

            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={() => setShowTherapistModal(true)}
              icon={<Stethoscope size={18} />}
            >
              Apply as a Therapist
            </Button>
          </div>

          <p className="text-center text-sm text-neutral-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
              Sign in
            </Link>
          </p>
        </form>
      </div>

      <TherapistApplicationModal 
        isOpen={showTherapistModal} 
        onClose={() => setShowTherapistModal(false)}
        onSuccess={handleTherapistSuccess}
      />

      <EmailVerificationModal 
        isOpen={showEmailVerification} 
        onClose={handleEmailVerificationClose}
        isTherapist={isTherapistSignup}
      />
    </div>
  );
};

export default SignUpPage;