/*
  # Fix Admin Dashboard Infinite Recursion

  1. Changes
    - Create a new function to check admin role without recursion
    - Update policies to use the new function
    - Fix the admin dashboard views to work properly with RLS
  
  2. Security
    - Maintain proper row-level security
    - Ensure admins can view all data
    - Ensure users can only access their own data
*/

-- Create a function to check if the current user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Get the role directly from the profiles table
  SELECT role INTO user_role FROM profiles WHERE id = auth.uid();
  RETURN user_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- Drop problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view therapist applications" ON therapist_applications;
DROP POLICY IF EXISTS "Authenticated users can update therapist applications" ON therapist_applications;
DROP POLICY IF EXISTS "Authenticated users can view therapists" ON therapists;
DROP POLICY IF EXISTS "Authenticated users can update therapists" ON therapists;

-- Create new policies using the is_admin() function
CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (is_admin() OR auth.uid() = id);

CREATE POLICY "Admins can view all therapist applications"
  ON therapist_applications
  FOR SELECT
  TO authenticated
  USING (is_admin() OR auth.uid() = user_id);

CREATE POLICY "Admins can update therapist applications"
  ON therapist_applications
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can view all therapists"
  ON therapists
  FOR SELECT
  TO authenticated
  USING (is_admin() OR auth.uid() = id);

CREATE POLICY "Admins can update therapists"
  ON therapists
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Create a view for therapist applications that works with RLS
CREATE OR REPLACE VIEW therapist_applications_view AS
SELECT 
  ta.id,
  ta.user_id,
  p.full_name,
  p.email,
  ta.specialization,
  ta.license_number,
  ta.license_state,
  ta.years_experience,
  ta.education,
  ta.certifications,
  ta.certificate_image_url,
  ta.application_status,
  ta.admin_notes,
  ta.submitted_at,
  ta.reviewed_at
FROM 
  therapist_applications ta
JOIN 
  profiles p ON ta.user_id = p.id;

-- Create a view for admin user management
CREATE OR REPLACE VIEW admin_users_view AS
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.role,
  p.avatar_url,
  p.created_at,
  p.updated_at,
  p.email_verified,
  CASE 
    WHEN t.id IS NOT NULL THEN t.verified
    ELSE NULL
  END AS therapist_verified
FROM 
  profiles p
LEFT JOIN 
  therapists t ON p.id = t.id;

-- Create a view for platform statistics
CREATE OR REPLACE VIEW admin_platform_stats AS
SELECT
  (SELECT COUNT(*) FROM profiles) AS total_users,
  (SELECT COUNT(*) FROM profiles WHERE role = 'user') AS regular_users,
  (SELECT COUNT(*) FROM profiles WHERE role = 'therapist') AS therapist_users,
  (SELECT COUNT(*) FROM profiles WHERE role = 'admin') AS admin_users,
  (SELECT COUNT(*) FROM therapists WHERE verified = true) AS verified_therapists,
  (SELECT COUNT(*) FROM therapist_applications WHERE application_status = 'pending') AS pending_applications,
  (SELECT COUNT(*) FROM mood_entries) AS total_mood_entries,
  (SELECT COUNT(*) FROM journal_entries) AS total_journal_entries,
  (SELECT COUNT(*) FROM forum_posts) AS total_forum_posts,
  (SELECT COUNT(*) FROM forum_comments) AS total_forum_comments,
  (SELECT COUNT(*) FROM rant_sessions) AS total_rant_sessions;

-- Create a view for recent activity
CREATE OR REPLACE VIEW admin_recent_activity AS
SELECT 'mood_entry' AS activity_type, user_id, created_at, id AS activity_id, NULL AS title
FROM mood_entries
UNION ALL
SELECT 'journal_entry' AS activity_type, user_id, created_at, id AS activity_id, title
FROM journal_entries
UNION ALL
SELECT 'forum_post' AS activity_type, author_id AS user_id, created_at, id AS activity_id, title
FROM forum_posts
UNION ALL
SELECT 'forum_comment' AS activity_type, author_id AS user_id, created_at, id AS activity_id, NULL AS title
FROM forum_comments
UNION ALL
SELECT 'rant_session' AS activity_type, user_id, created_at, id AS activity_id, NULL AS title
FROM rant_sessions
ORDER BY created_at DESC
LIMIT 100;

-- Create a function to create an admin user
CREATE OR REPLACE FUNCTION create_admin_user(
  email TEXT,
  password TEXT,
  full_name TEXT
)
RETURNS UUID AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Check if the current user is an admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only existing administrators can create new admin accounts';
  END IF;

  -- Create the user in auth.users
  INSERT INTO auth.users (
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data
  ) VALUES (
    email,
    crypt(password, gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('full_name', full_name, 'role', 'admin')
  )
  RETURNING id INTO new_user_id;

  -- Create profile with admin role
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    role
  ) VALUES (
    new_user_id,
    full_name,
    email,
    'admin'
  );

  -- Create user settings
  INSERT INTO public.user_settings (user_id)
  VALUES (new_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_admin_user(TEXT, TEXT, TEXT) TO authenticated;