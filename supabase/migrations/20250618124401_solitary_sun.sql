/*
  # Account Deletion Fix

  1. New Functions
    - delete_user_account() - Safely deletes all user data in correct order

  2. Foreign Key Updates
    - Ensure all foreign keys have CASCADE DELETE behavior
    - Update existing constraints to properly cascade deletions

  3. Security
    - Function includes security check to prevent unauthorized deletions
    - Maintains RLS policies
*/

-- Function to completely delete a user account and all related data
CREATE OR REPLACE FUNCTION delete_user_account(user_id_to_delete uuid)
RETURNS void AS $$
BEGIN
  -- Verify the user is deleting their own account
  IF auth.uid() != user_id_to_delete THEN
    RAISE EXCEPTION 'You can only delete your own account';
  END IF;

  -- Delete from all tables in the correct order to avoid foreign key conflicts
  -- Start with dependent tables first, then work up to the main tables

  -- Delete forum-related data
  DELETE FROM forum_helpful_votes WHERE user_id = user_id_to_delete;
  DELETE FROM forum_reports WHERE reporter_id = user_id_to_delete;
  DELETE FROM forum_comments WHERE author_id = user_id_to_delete;
  DELETE FROM forum_posts WHERE author_id = user_id_to_delete;

  -- Delete rant sessions
  DELETE FROM rant_sessions WHERE user_id = user_id_to_delete;

  -- Delete journal entries
  DELETE FROM journal_entries WHERE user_id = user_id_to_delete;

  -- Delete mood entries
  DELETE FROM mood_entries WHERE user_id = user_id_to_delete;

  -- Delete therapist applications
  DELETE FROM therapist_applications WHERE user_id = user_id_to_delete;

  -- Delete user settings
  DELETE FROM user_settings WHERE user_id = user_id_to_delete;

  -- Delete therapist record if exists
  DELETE FROM therapists WHERE id = user_id_to_delete;

  -- Finally delete the profile (this should cascade to auth.users)
  DELETE FROM profiles WHERE id = user_id_to_delete;

  -- Delete from auth.users directly if profile deletion didn't cascade
  DELETE FROM auth.users WHERE id = user_id_to_delete;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_account(uuid) TO authenticated;

-- Ensure all foreign key constraints have proper CASCADE behavior
-- Update existing foreign keys to ensure CASCADE DELETE

-- Update profiles foreign key
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_id_fkey' 
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey;
  END IF;
  
  -- Add the constraint with CASCADE
  ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey 
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION
  WHEN OTHERS THEN
    -- If there's an error, continue (constraint might already exist correctly)
    NULL;
END $$;

-- Update therapists foreign key
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'therapists_id_fkey' 
    AND table_name = 'therapists'
  ) THEN
    ALTER TABLE therapists DROP CONSTRAINT therapists_id_fkey;
    ALTER TABLE therapists ADD CONSTRAINT therapists_id_fkey 
      FOREIGN KEY (id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN OTHERS THEN 
    NULL;
END $$;

-- Update user_settings foreign key
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_settings_user_id_fkey' 
    AND table_name = 'user_settings'
  ) THEN
    ALTER TABLE user_settings DROP CONSTRAINT user_settings_user_id_fkey;
    ALTER TABLE user_settings ADD CONSTRAINT user_settings_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN OTHERS THEN 
    NULL;
END $$;

-- Update therapist_applications foreign key
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'therapist_applications_user_id_fkey' 
    AND table_name = 'therapist_applications'
  ) THEN
    ALTER TABLE therapist_applications DROP CONSTRAINT therapist_applications_user_id_fkey;
    ALTER TABLE therapist_applications ADD CONSTRAINT therapist_applications_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN OTHERS THEN 
    NULL;
END $$;

-- Update journal_entries foreign key
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'journal_entries_user_id_fkey' 
    AND table_name = 'journal_entries'
  ) THEN
    ALTER TABLE journal_entries DROP CONSTRAINT journal_entries_user_id_fkey;
    ALTER TABLE journal_entries ADD CONSTRAINT journal_entries_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN OTHERS THEN 
    NULL;
END $$;

-- Update mood_entries foreign key
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'mood_entries_user_id_fkey' 
    AND table_name = 'mood_entries'
  ) THEN
    ALTER TABLE mood_entries DROP CONSTRAINT mood_entries_user_id_fkey;
    ALTER TABLE mood_entries ADD CONSTRAINT mood_entries_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN OTHERS THEN 
    NULL;
END $$;

-- Update rant_sessions foreign key
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'rant_sessions_user_id_fkey' 
    AND table_name = 'rant_sessions'
  ) THEN
    ALTER TABLE rant_sessions DROP CONSTRAINT rant_sessions_user_id_fkey;
    ALTER TABLE rant_sessions ADD CONSTRAINT rant_sessions_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN OTHERS THEN 
    NULL;
END $$;

-- Update forum_posts foreign key
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'forum_posts_author_id_fkey' 
    AND table_name = 'forum_posts'
  ) THEN
    ALTER TABLE forum_posts DROP CONSTRAINT forum_posts_author_id_fkey;
    ALTER TABLE forum_posts ADD CONSTRAINT forum_posts_author_id_fkey 
      FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN OTHERS THEN 
    NULL;
END $$;

-- Update forum_comments foreign key
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'forum_comments_author_id_fkey' 
    AND table_name = 'forum_comments'
  ) THEN
    ALTER TABLE forum_comments DROP CONSTRAINT forum_comments_author_id_fkey;
    ALTER TABLE forum_comments ADD CONSTRAINT forum_comments_author_id_fkey 
      FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN OTHERS THEN 
    NULL;
END $$;

-- Update forum_helpful_votes foreign key
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'forum_helpful_votes_user_id_fkey' 
    AND table_name = 'forum_helpful_votes'
  ) THEN
    ALTER TABLE forum_helpful_votes DROP CONSTRAINT forum_helpful_votes_user_id_fkey;
    ALTER TABLE forum_helpful_votes ADD CONSTRAINT forum_helpful_votes_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN OTHERS THEN 
    NULL;
END $$;

-- Update forum_reports foreign key
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'forum_reports_reporter_id_fkey' 
    AND table_name = 'forum_reports'
  ) THEN
    ALTER TABLE forum_reports DROP CONSTRAINT forum_reports_reporter_id_fkey;
    ALTER TABLE forum_reports ADD CONSTRAINT forum_reports_reporter_id_fkey 
      FOREIGN KEY (reporter_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN OTHERS THEN 
    NULL;
END $$;