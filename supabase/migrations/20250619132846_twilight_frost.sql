/*
  # Fix therapist signup duplicate profile error

  1. Updates
    - Fix the `apply_for_therapist_role_frontend` RPC function to handle existing profiles
    - Use UPSERT operation to avoid duplicate key violations
    - Ensure proper error handling for edge cases

  2. Changes
    - Replace the existing RPC function with improved logic
    - Handle cases where a profile already exists (from previous signup attempts or regular user signup)
    - Maintain data integrity and proper role assignment
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS apply_for_therapist_role_frontend(text, text, text, text, text, text, integer, text, text[], text);

-- Create the improved function with proper UPSERT logic
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
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid;
  application_id uuid;
  existing_profile_count integer;
BEGIN
  -- Create the user account
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    email,
    crypt(password, gen_salt('bf')),
    NOW(),
    NULL,
    NULL,
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('full_name', full_name),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ) RETURNING id INTO user_id;

  -- Check if profile already exists (in case handle_new_user trigger already ran)
  SELECT COUNT(*) INTO existing_profile_count 
  FROM profiles 
  WHERE id = user_id;

  -- Insert or update profile using UPSERT
  INSERT INTO profiles (
    id,
    full_name,
    email,
    role,
    created_at,
    updated_at
  ) VALUES (
    user_id,
    full_name,
    email,
    'user', -- Start as regular user, will be updated to therapist after approval
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    updated_at = NOW();

  -- Create the therapist application
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
    submitted_at,
    created_at,
    updated_at
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
    NOW(),
    NOW(),
    NOW()
  ) RETURNING id INTO application_id;

  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'user_id', user_id,
    'application_id', application_id,
    'message', 'Therapist application submitted successfully'
  );

EXCEPTION
  WHEN unique_violation THEN
    -- Handle case where email already exists
    IF SQLERRM LIKE '%auth_users_email_key%' THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'email_already_exists',
        'message', 'An account with this email already exists. Please use a different email or sign in to your existing account.'
      );
    ELSIF SQLERRM LIKE '%therapist_applications_user_id%' THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'application_already_exists',
        'message', 'You have already submitted a therapist application. Please check your email for updates or contact support.'
      );
    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'error', 'duplicate_constraint',
        'message', 'A record with this information already exists. Please try again or contact support.'
      );
    END IF;
  WHEN OTHERS THEN
    -- Handle any other errors
    RETURN jsonb_build_object(
      'success', false,
      'error', 'application_failed',
      'message', 'Failed to submit therapist application: ' || SQLERRM
    );
END;
$$;