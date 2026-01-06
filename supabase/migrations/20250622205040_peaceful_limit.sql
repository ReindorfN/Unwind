/*
  # Gamification System Implementation

  1. New Tables
    - `user_gamification`
      - `user_id` (uuid, primary key)
      - `points` (integer)
      - `level` (integer)
      - `streak` (integer)
      - `achievements` (jsonb)
      - `last_activity_date` (date)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on user_gamification table
    - Add policies for user access to own data

  3. Functions
    - `update_user_streak()` - Updates user streak based on activity
*/

-- Create user_gamification table
CREATE TABLE IF NOT EXISTS user_gamification (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  points integer DEFAULT 0,
  level integer DEFAULT 1,
  streak integer DEFAULT 0,
  achievements jsonb DEFAULT '[]'::jsonb,
  last_activity_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE user_gamification ENABLE ROW LEVEL SECURITY;

-- User gamification policies
CREATE POLICY "Users can view own gamification data"
  ON user_gamification FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gamification data"
  ON user_gamification FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gamification data"
  ON user_gamification FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_gamification_updated_at
  BEFORE UPDATE ON user_gamification
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_gamification_user_id ON user_gamification(user_id);
CREATE INDEX IF NOT EXISTS idx_user_gamification_streak ON user_gamification(streak);

-- Function to update streak
CREATE OR REPLACE FUNCTION update_user_streak()
RETURNS trigger AS $$
DECLARE
  last_activity date;
  current_streak integer;
BEGIN
  -- Get the user's last activity date and current streak
  SELECT last_activity_date, streak INTO last_activity, current_streak
  FROM user_gamification
  WHERE user_id = NEW.user_id;
  
  -- If no previous record, initialize
  IF last_activity IS NULL THEN
    INSERT INTO user_gamification (user_id, streak, last_activity_date)
    VALUES (NEW.user_id, 1, CURRENT_DATE)
    ON CONFLICT (user_id) DO UPDATE
    SET streak = 1, last_activity_date = CURRENT_DATE;
    RETURN NEW;
  END IF;
  
  -- Check if this is a new day
  IF CURRENT_DATE > last_activity THEN
    -- Check if it's consecutive (yesterday)
    IF CURRENT_DATE = last_activity + INTERVAL '1 day' THEN
      -- Increment streak
      UPDATE user_gamification
      SET streak = streak + 1, last_activity_date = CURRENT_DATE
      WHERE user_id = NEW.user_id;
    ELSE
      -- Reset streak
      UPDATE user_gamification
      SET streak = 1, last_activity_date = CURRENT_DATE
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for streak updates
CREATE TRIGGER update_streak_on_mood_entry
  AFTER INSERT ON mood_entries
  FOR EACH ROW EXECUTE FUNCTION update_user_streak();

CREATE TRIGGER update_streak_on_journal_entry
  AFTER INSERT ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION update_user_streak();