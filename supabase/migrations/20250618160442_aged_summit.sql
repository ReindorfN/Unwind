/*
  # Admin Dashboard and User Management

  1. Functions
    - `create_admin_user` for creating new admin accounts
    - `delete_user_account` for account management
  
  2. Views
    - `admin_users_view` for user management dashboard
    - `admin_platform_stats` for platform statistics
    - `admin_recent_activity` for activity monitoring
  
  3. Security
    - Admin-only policies for sensitive operations
    - Proper RLS setup for admin views
*/

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS delete_user_account(uuid);
DROP FUNCTION IF EXISTS create_admin_user(TEXT, TEXT, TEXT);

-- Function to create an admin user
CREATE OR REPLACE FUNCTION create_admin_user(
  email TEXT,
  password TEXT,
  full_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Check if the current user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only existing administrators can create new admin accounts';
  END IF;

  -- Create the user in auth.users
  new_user_id := extensions.uuid_generate_v4();
  
  -- Insert directly into auth.users (this requires superuser privileges)
  -- In a real production environment, you would use Supabase admin APIs instead
  -- This is a simplified example
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
    jsonb_build_object('full_name', full_name, 'role', 'admin')
  );

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
$$;

-- Function to delete a user account completely
CREATE OR REPLACE FUNCTION delete_user_account(user_id_to_delete UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the current user is an admin or the user being deleted
  IF auth.uid() != user_id_to_delete AND NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only administrators can delete other user accounts';
  END IF;

  -- Delete from all related tables
  -- The ON DELETE CASCADE constraints will handle most relationships
  
  -- Delete from auth.users (requires superuser privileges)
  -- In a real production environment, you would use Supabase admin APIs instead
  DELETE FROM auth.users WHERE id = user_id_to_delete;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_admin_user(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO authenticated;

-- Drop existing views if they exist
DROP VIEW IF EXISTS admin_users_view;
DROP VIEW IF EXISTS admin_platform_stats;
DROP VIEW IF EXISTS admin_recent_activity;

-- Create admin dashboard views
CREATE VIEW admin_users_view AS
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
  therapists t ON p.id = t.id
ORDER BY 
  p.created_at DESC;

-- Create a view for platform statistics
CREATE VIEW admin_platform_stats AS
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
CREATE VIEW admin_recent_activity AS
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

-- Ensure RLS is properly set up for admin views
ALTER VIEW admin_users_view OWNER TO postgres;
ALTER VIEW admin_platform_stats OWNER TO postgres;
ALTER VIEW admin_recent_activity OWNER TO postgres;

-- Create policies for admin access (only if they don't exist)
DO $$
BEGIN
  -- Check and create admin profile policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Admins can view all profiles'
  ) THEN
    CREATE POLICY "Admins can view all profiles"
      ON profiles FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;

  -- Check and create admin therapist applications policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'therapist_applications' 
    AND policyname = 'Admins can view all therapist applications'
  ) THEN
    CREATE POLICY "Admins can view all therapist applications"
      ON therapist_applications FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;

  -- Check and create admin therapist applications update policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'therapist_applications' 
    AND policyname = 'Admins can update all therapist applications'
  ) THEN
    CREATE POLICY "Admins can update all therapist applications"
      ON therapist_applications FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;

  -- Check and create admin therapists view policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'therapists' 
    AND policyname = 'Admins can view all therapists'
  ) THEN
    CREATE POLICY "Admins can view all therapists"
      ON therapists FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;

  -- Check and create admin therapists update policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'therapists' 
    AND policyname = 'Admins can update all therapists'
  ) THEN
    CREATE POLICY "Admins can update all therapists"
      ON therapists FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;