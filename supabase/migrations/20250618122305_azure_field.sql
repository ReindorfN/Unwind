/*
  # Therapist Signup Enhancements

  1. New Tables
    - `therapist_applications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `specialization` (text)
      - `license_number` (text)
      - `license_state` (text)
      - `years_experience` (integer)
      - `education` (text)
      - `certifications` (text[])
      - `certificate_image_url` (text)
      - `application_status` (text)
      - `admin_notes` (text)
      - `submitted_at` (timestamp)
      - `reviewed_at` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on therapist_applications table
    - Add policies for user access to own applications
    - Add admin policies for reviewing applications

  3. Updates
    - Add email_verified column to profiles table
    - Update therapists table structure
*/

-- Add email_verified column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email_verified boolean DEFAULT false;
  END IF;
END $$;

-- Create therapist_applications table
CREATE TABLE IF NOT EXISTS therapist_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  specialization text NOT NULL,
  license_number text NOT NULL,
  license_state text NOT NULL,
  years_experience integer NOT NULL CHECK (years_experience >= 0),
  education text NOT NULL,
  certifications text[] DEFAULT '{}',
  certificate_image_url text,
  application_status text NOT NULL DEFAULT 'pending' CHECK (application_status IN ('pending', 'under_review', 'approved', 'rejected')),
  admin_notes text,
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE therapist_applications ENABLE ROW LEVEL SECURITY;

-- Therapist applications policies
CREATE POLICY "Users can view own applications"
  ON therapist_applications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own applications"
  ON therapist_applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending applications"
  ON therapist_applications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND application_status = 'pending')
  WITH CHECK (auth.uid() = user_id AND application_status = 'pending');

CREATE POLICY "Admins can view all applications"
  ON therapist_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all applications"
  ON therapist_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_therapist_applications_user_id ON therapist_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_therapist_applications_status ON therapist_applications(application_status);
CREATE INDEX IF NOT EXISTS idx_therapist_applications_submitted_at ON therapist_applications(submitted_at);

-- Create trigger for updated_at
CREATE TRIGGER update_therapist_applications_updated_at
  BEFORE UPDATE ON therapist_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle therapist application approval
CREATE OR REPLACE FUNCTION approve_therapist_application(application_id uuid)
RETURNS void AS $$
DECLARE
  app_user_id uuid;
BEGIN
  -- Get the user_id from the application
  SELECT user_id INTO app_user_id
  FROM therapist_applications
  WHERE id = application_id AND application_status = 'under_review';

  IF app_user_id IS NULL THEN
    RAISE EXCEPTION 'Application not found or not under review';
  END IF;

  -- Update the application status
  UPDATE therapist_applications
  SET 
    application_status = 'approved',
    reviewed_at = now()
  WHERE id = application_id;

  -- Update user role to therapist
  UPDATE profiles
  SET role = 'therapist'
  WHERE id = app_user_id;

  -- Create therapist record
  INSERT INTO therapists (id, specialization, license_number, verified)
  SELECT 
    app_user_id,
    specialization,
    license_number,
    true
  FROM therapist_applications
  WHERE id = application_id
  ON CONFLICT (id) DO UPDATE SET
    specialization = EXCLUDED.specialization,
    license_number = EXCLUDED.license_number,
    verified = true;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle therapist application rejection
CREATE OR REPLACE FUNCTION reject_therapist_application(application_id uuid, rejection_reason text)
RETURNS void AS $$
BEGIN
  -- Update the application status
  UPDATE therapist_applications
  SET 
    application_status = 'rejected',
    admin_notes = rejection_reason,
    reviewed_at = now()
  WHERE id = application_id AND application_status = 'under_review';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found or not under review';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;