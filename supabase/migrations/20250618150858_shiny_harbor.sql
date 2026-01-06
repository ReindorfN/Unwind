/*
  # Create therapist application function

  1. New Functions
    - `apply_for_therapist_role` - Handles therapist application submission
      - Creates/updates user profile
      - Creates user settings
      - Creates therapist application record
      - Returns success/error status

  2. Security
    - Function uses SECURITY DEFINER for elevated permissions
    - Validates that user can only create applications for themselves
    - Grants execute permission to authenticated users
*/

-- Drop any existing function with this name (regardless of parameters)
DROP FUNCTION IF EXISTS public.apply_for_therapist_role;

-- Create the therapist application function
CREATE OR REPLACE FUNCTION public.apply_for_therapist_role(
  user_id uuid,
  specialization text,
  license_number text,
  license_state text,
  years_experience integer,
  education text,
  certifications text[] DEFAULT '{}',
  certificate_image_url text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  application_id uuid;
  result json;
BEGIN
  -- Validate that the user_id matches the authenticated user
  IF auth.uid() != user_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot create application for another user';
  END IF;

  -- Create or update the user profile
  INSERT INTO public.profiles (id, role)
  VALUES (user_id, 'user')
  ON CONFLICT (id) 
  DO UPDATE SET 
    role = 'user',
    updated_at = now();

  -- Create user settings
  INSERT INTO public.user_settings (user_id)
  VALUES (user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Create the therapist application
  INSERT INTO public.therapist_applications (
    user_id,
    specialization,
    license_number,
    license_state,
    years_experience,
    education,
    certifications,
    certificate_image_url,
    application_status
  )
  VALUES (
    user_id,
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
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.apply_for_therapist_role TO authenticated;