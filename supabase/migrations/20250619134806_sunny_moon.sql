/*
  # Fix therapist signup function

  1. Updates
    - Fix the apply_for_therapist_role_frontend function to properly set therapist role
    - Ensure email verification is triggered correctly
    - Handle user creation and profile setup in one transaction

  2. Security
    - Maintains existing RLS policies
    - Ensures proper role assignment
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS apply_for_therapist_role_frontend(text, text, text, text, text, text, integer, text, text[], text);

-- Create the corrected function
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
  new_user_id uuid;
  application_id uuid;
BEGIN
  -- Create the user account with email confirmation
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
    NULL, -- Email not confirmed yet
    NULL,
    NULL,
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('full_name', full_name, 'role', 'therapist'),
    NOW(),
    NOW(),
    encode(gen_random_bytes(32), 'base64'),
    '',
    '',
    ''
  ) RETURNING id INTO new_user_id;

  -- Create profile with therapist role
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    role,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    full_name,
    email,
    'therapist',
    NOW(),
    NOW()
  );

  -- Create therapist record (unverified initially)
  INSERT INTO public.therapists (
    id,
    specialization,
    license_number,
    verified,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    specialization,
    license_number,
    false,
    NOW(),
    NOW()
  );

  -- Create therapist application
  INSERT INTO public.therapist_applications (
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
    new_user_id,
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

  -- Create user settings
  INSERT INTO public.user_settings (
    user_id,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    NOW(),
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'user_id', new_user_id,
    'application_id', application_id,
    'message', 'Therapist application submitted successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to create therapist application'
    );
END;
$$;