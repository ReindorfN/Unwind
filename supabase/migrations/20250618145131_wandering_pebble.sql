/*
  # Fix Therapist Signup Flow

  1. Changes
     - Add trigger to automatically create profiles with correct role from auth.users
     - Update RLS policies to ensure proper access control
     - Add function to handle therapist verification

  2. Security
     - Enable RLS on all relevant tables
     - Add policies for proper access control
*/

-- Create a trigger function to automatically create profiles with correct role
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    role = EXCLUDED.role;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Drop existing INSERT policy on profiles
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create a new INSERT policy for profiles
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Update the UPDATE policy for profiles
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Ensure SELECT policies are correct
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;

CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can view profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Create a function to apply for therapist role
CREATE OR REPLACE FUNCTION apply_for_therapist_role(
  specialization TEXT,
  license_number TEXT,
  license_state TEXT,
  years_experience INTEGER,
  education TEXT,
  certifications TEXT[] DEFAULT NULL,
  certificate_image_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  application_id UUID;
BEGIN
  -- Update the user's role to therapist
  UPDATE profiles
  SET role = 'therapist'
  WHERE id = auth.uid();
  
  -- Create therapist record (unverified)
  INSERT INTO therapists (
    id,
    specialization,
    license_number,
    verified
  ) VALUES (
    auth.uid(),
    specialization,
    license_number,
    false
  )
  ON CONFLICT (id) DO UPDATE
  SET
    specialization = EXCLUDED.specialization,
    license_number = EXCLUDED.license_number;
  
  -- Create therapist application
  INSERT INTO therapist_applications (
    user_id,
    specialization,
    license_number,
    license_state,
    years_experience,
    education,
    certifications,
    certificate_image_url,
    application_status
  ) VALUES (
    auth.uid(),
    specialization,
    license_number,
    license_state,
    years_experience,
    education,
    COALESCE(certifications, '{}'),
    certificate_image_url,
    'pending'
  )
  RETURNING id INTO application_id;
  
  RETURN application_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION apply_for_therapist_role(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT[], TEXT) TO authenticated;