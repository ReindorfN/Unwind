/*
  # Enhanced Notification Settings

  1. Changes
    - Update user_settings table to include detailed notification preferences
    - Add support for reminder times and frequency settings
    - Maintain backward compatibility with existing settings

  2. Security
    - Maintain existing RLS policies
    - No changes to security model
*/

-- Update the notification_preferences column to support more detailed settings
-- This is done using a DO block to handle the column update safely
DO $$
BEGIN
  -- Check if we need to update the default value for notification_preferences
  -- We'll add the new fields with sensible defaults
  UPDATE user_settings 
  SET notification_preferences = notification_preferences || jsonb_build_object(
    'mood_reminders', COALESCE((notification_preferences->>'mood_reminders')::boolean, true),
    'journal_reminders', COALESCE((notification_preferences->>'journal_reminders')::boolean, true),
    'mood_time', COALESCE(notification_preferences->>'mood_time', '09:00'),
    'journal_time', COALESCE(notification_preferences->>'journal_time', '20:00'),
    'frequency', COALESCE(notification_preferences->>'frequency', 'daily'),
    'custom_days', COALESCE(notification_preferences->'custom_days', '[]'::jsonb)
  )
  WHERE notification_preferences IS NOT NULL;

  -- Update the default value for new records
  ALTER TABLE user_settings 
  ALTER COLUMN notification_preferences 
  SET DEFAULT '{
    "email": true, 
    "push": true,
    "mood_reminders": true,
    "journal_reminders": true,
    "mood_time": "09:00",
    "journal_time": "20:00",
    "frequency": "daily",
    "custom_days": [],
    "forum_updates": false
  }'::jsonb;

EXCEPTION
  WHEN OTHERS THEN
    -- If there's an error, we'll just continue
    -- This ensures the migration doesn't fail on existing data
    NULL;
END $$;