/*
  # Fix Therapist Application Process

  1. Changes
    - Fix the apply_for_therapist_role function to properly handle application submission
    - Ensure therapist applications are properly inserted into the database
    - Add a function to update application status from pending to under_review
    - Fix the approval and rejection process

  2. Security
    - Maintain proper security checks
    - Ensure functions are properly secured
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS apply_for_therapist_role;

-- Create an improved function for therapist application
CREATE OR REPLACE FUNCTION apply_for_therapist_role(
  user_id uuid,
  specialization text,
  license_number text,
  license_state text,
  years_experience integer,
  education text,
  certifications text[] DEFAULT '{}',
  certificate_image_url text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  application_id uuid;
BEGIN
  -- Verify the user is applying for themselves
  IF auth.uid() != user_id THEN
    RAISE EXCEPTION 'You can only apply for yourself';
  END IF;

  -- Insert the application
  INSERT INTO therapist_applications (
    user_id,
    specialization,
    license_number,
    license_state,
    years_experience,
    education,
    certifications,
    certificate_image_url,
    application_status,
    submitted_at
  ) VALUES (
    user_id,
    specialization,
    license_number,
    license_state,
    years_experience,
    education,
    certifications,
    certificate_image_url,
    'pending',
    now()
  )
  RETURNING id INTO application_id;

  -- Update the user's role to therapist (but unverified)
  UPDATE profiles
  SET role = 'therapist'
  WHERE id = user_id;

  -- Create or update the therapist record (unverified)
  INSERT INTO therapists (
    id,
    specialization,
    license_number,
    verified,
    bio,
    education
  ) VALUES (
    user_id,
    specialization,
    license_number,
    false,
    'Therapist bio pending verification',
    education
  )
  ON CONFLICT (id) DO UPDATE
  SET
    specialization = EXCLUDED.specialization,
    license_number = EXCLUDED.license_number,
    education = EXCLUDED.education;

  RETURN application_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION apply_for_therapist_role(uuid, text, text, text, integer, text, text[], text) TO authenticated;

-- Function to set application status to under review
CREATE OR REPLACE FUNCTION set_application_under_review(application_id uuid)
RETURNS void AS $$
BEGIN
  -- Check if the current user is an admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can review applications';
  END IF;

  -- Update the application status
  UPDATE therapist_applications
  SET application_status = 'under_review'
  WHERE id = application_id AND application_status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found or not in pending status';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION set_application_under_review(uuid) TO authenticated;

-- Fix the approve_therapist_application function
DROP FUNCTION IF EXISTS approve_therapist_application;

CREATE OR REPLACE FUNCTION approve_therapist_application(application_id uuid)
RETURNS void AS $$
DECLARE
  app_user_id uuid;
  app_specialization text;
  app_license_number text;
  app_education text;
BEGIN
  -- Check if the current user is an admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can approve applications';
  END IF;

  -- Get the application details
  SELECT 
    user_id, 
    specialization, 
    license_number, 
    education 
  INTO 
    app_user_id, 
    app_specialization, 
    app_license_number, 
    app_education
  FROM therapist_applications
  WHERE id = application_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  -- Update the application status
  UPDATE therapist_applications
  SET 
    application_status = 'approved',
    reviewed_at = now()
  WHERE id = application_id;

  -- Update user role to therapist (should already be set, but just in case)
  UPDATE profiles
  SET role = 'therapist'
  WHERE id = app_user_id;

  -- Update therapist record to be verified
  UPDATE therapists
  SET 
    verified = true,
    specialization = app_specialization,
    license_number = app_license_number,
    education = app_education
  WHERE id = app_user_id;

  -- If no therapist record exists, create one
  IF NOT FOUND THEN
    INSERT INTO therapists (
      id,
      specialization,
      license_number,
      verified,
      education
    ) VALUES (
      app_user_id,
      app_specialization,
      app_license_number,
      true,
      app_education
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION approve_therapist_application(uuid) TO authenticated;

-- Fix the reject_therapist_application function
DROP FUNCTION IF EXISTS reject_therapist_application;

CREATE OR REPLACE FUNCTION reject_therapist_application(application_id uuid, rejection_reason text)
RETURNS void AS $$
DECLARE
  app_user_id uuid;
BEGIN
  -- Check if the current user is an admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can reject applications';
  END IF;

  -- Get the user_id from the application
  SELECT user_id INTO app_user_id
  FROM therapist_applications
  WHERE id = application_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  -- Update the application status
  UPDATE therapist_applications
  SET 
    application_status = 'rejected',
    admin_notes = rejection_reason,
    reviewed_at = now()
  WHERE id = application_id;

  -- Update therapist record to be unverified
  UPDATE therapists
  SET verified = false
  WHERE id = app_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION reject_therapist_application(uuid, text) TO authenticated;

-- Create a function to apply for therapist role directly from the frontend
CREATE OR REPLACE FUNCTION apply_for_therapist_role_frontend(
  email text,
  password text,
  full_name text,
  specialization text,
  license_number text,
  license_state text,
  years_experience integer,
  education text,
  certifications text[] DEFAULT '{}',
  certificate_image_url text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  new_user_id uuid;
  application_id uuid;
  result json;
BEGIN
  -- Create the user account
  new_user_id := extensions.uuid_generate_v4();
  
  -- Insert into auth.users
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data
  ) VALUES (
    new_user_id,
    email,
    crypt(password, gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('full_name', full_name, 'role', 'therapist')
  );

  -- Create profile
  INSERT INTO profiles (
    id,
    full_name,
    email,
    role
  ) VALUES (
    new_user_id,
    full_name,
    email,
    'therapist'
  );

  -- Create user settings
  INSERT INTO user_settings (user_id)
  VALUES (new_user_id);

  -- Create therapist record (unverified)
  INSERT INTO therapists (
    id,
    specialization,
    license_number,
    verified,
    education
  ) VALUES (
    new_user_id,
    specialization,
    license_number,
    false,
    education
  );

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
    new_user_id,
    specialization,
    license_number,
    license_state,
    years_experience,
    education,
    certifications,
    certificate_image_url,
    'pending'
  )
  RETURNING id INTO application_id;

  -- Return success result
  result := json_build_object(
    'success', true,
    'user_id', new_user_id,
    'application_id', application_id,
    'message', 'Therapist application submitted successfully'
  );

  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- Return error result
    result := json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to submit therapist application'
    );
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION apply_for_therapist_role_frontend(text, text, text, text, text, text, integer, text, text[], text) TO anon;
GRANT EXECUTE ON FUNCTION apply_for_therapist_role_frontend(text, text, text, text, text, text, integer, text, text[], text) TO authenticated;