/*
  # AI Rant Companion Feature

  1. New Tables
    - rant_sessions
      - id (uuid, primary key)
      - user_id (uuid, references profiles)
      - input_text (text)
      - input_audio_url (text, optional)
      - detected_emotion (text)
      - confidence_score (numeric)
      - video_response_id (text)
      - mood_before (integer, 1-5 scale)
      - mood_after (integer, 1-5 scale)
      - created_at (timestamp)
      - updated_at (timestamp)

    - emotion_categories
      - id (uuid, primary key)
      - name (text)
      - keywords (text array)
      - video_ids (text array)
      - color (text)
      - description (text)
      - created_at (timestamp)

    - tavus_videos
      - id (text, primary key)
      - title (text)
      - description (text)
      - video_url (text)
      - thumbnail_url (text)
      - duration (integer, seconds)
      - emotion_category (text)
      - created_at (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for user access
*/

-- Create rant_sessions table
CREATE TABLE IF NOT EXISTS rant_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  input_text text NOT NULL,
  input_audio_url text,
  detected_emotion text NOT NULL,
  confidence_score numeric(5,2) DEFAULT 0,
  video_response_id text NOT NULL,
  mood_before integer CHECK (mood_before >= 1 AND mood_before <= 5),
  mood_after integer CHECK (mood_after >= 1 AND mood_after <= 5),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create emotion_categories table
CREATE TABLE IF NOT EXISTS emotion_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  keywords text[] NOT NULL,
  video_ids text[] NOT NULL,
  color text NOT NULL DEFAULT '#78A083',
  description text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create tavus_videos table
CREATE TABLE IF NOT EXISTS tavus_videos (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  video_url text NOT NULL,
  thumbnail_url text NOT NULL,
  duration integer NOT NULL DEFAULT 0,
  emotion_category text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE rant_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE emotion_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tavus_videos ENABLE ROW LEVEL SECURITY;

-- Rant sessions policies
CREATE POLICY "Users can view own rant sessions"
  ON rant_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own rant sessions"
  ON rant_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rant sessions"
  ON rant_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Emotion categories policies (read-only for users)
CREATE POLICY "Anyone can view emotion categories"
  ON emotion_categories FOR SELECT
  TO authenticated
  USING (true);

-- Tavus videos policies (read-only for users)
CREATE POLICY "Anyone can view tavus videos"
  ON tavus_videos FOR SELECT
  TO authenticated
  USING (true);

-- Insert default emotion categories
INSERT INTO emotion_categories (name, keywords, video_ids, color, description) VALUES
  (
    'Anger & Frustration',
    ARRAY['angry', 'mad', 'furious', 'frustrated', 'rage', 'annoyed', 'irritated', 'pissed'],
    ARRAY['anger_validation_1', 'anger_breathing_1', 'anger_understanding_1'],
    '#dc2626',
    'Validating and calming responses for anger'
  ),
  (
    'Anxiety & Worry',
    ARRAY['anxious', 'worried', 'nervous', 'panic', 'scared', 'overwhelmed', 'stress'],
    ARRAY['anxiety_grounding_1', 'anxiety_breathing_1', 'anxiety_comfort_1'],
    '#7c3aed',
    'Grounding techniques and reassurance'
  ),
  (
    'Sadness & Grief',
    ARRAY['sad', 'depressed', 'grief', 'loss', 'heartbroken', 'crying', 'lonely', 'empty'],
    ARRAY['sadness_comfort_1', 'sadness_validation_1', 'sadness_hope_1'],
    '#1f2937',
    'Compassionate support and validation'
  ),
  (
    'Loneliness & Isolation',
    ARRAY['lonely', 'alone', 'isolated', 'disconnected', 'abandoned', 'rejected'],
    ARRAY['loneliness_connection_1', 'loneliness_comfort_1', 'loneliness_hope_1'],
    '#059669',
    'Connection and belonging support'
  ),
  (
    'Hopelessness & Despair',
    ARRAY['hopeless', 'despair', 'suicidal', 'worthless', 'pointless', 'give up', 'end it'],
    ARRAY['crisis_support_1', 'hope_restoration_1', 'crisis_validation_1'],
    '#4338ca',
    'Crisis support and hope restoration'
  ),
  (
    'Confusion & Uncertainty',
    ARRAY['confused', 'lost', 'uncertain', 'don''t know', 'unclear', 'mixed up'],
    ARRAY['clarity_support_1', 'confusion_validation_1', 'guidance_1'],
    '#ea580c',
    'Clarity and guidance support'
  )
ON CONFLICT (name) DO NOTHING;

-- Insert sample Tavus videos
INSERT INTO tavus_videos (id, title, description, video_url, thumbnail_url, duration, emotion_category) VALUES
  (
    'anger_validation_1',
    'Understanding Your Anger',
    'A compassionate response validating angry feelings and providing healthy outlets',
    'https://example.com/tavus/anger_validation_1.mp4',
    'https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=300&w=400',
    120,
    'angry'
  ),
  (
    'anger_breathing_1',
    'Calming Breathing for Anger',
    'Guided breathing exercises to help manage intense anger',
    'https://example.com/tavus/anger_breathing_1.mp4',
    'https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=300&w=400',
    180,
    'angry'
  ),
  (
    'anxiety_grounding_1',
    'Grounding Techniques for Anxiety',
    'Practical grounding techniques to help with overwhelming anxiety',
    'https://example.com/tavus/anxiety_grounding_1.mp4',
    'https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=300&w=400',
    180,
    'anxious'
  ),
  (
    'anxiety_breathing_1',
    'Breathing for Anxiety Relief',
    'Calming breathing exercises specifically for anxiety',
    'https://example.com/tavus/anxiety_breathing_1.mp4',
    'https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=300&w=400',
    150,
    'anxious'
  ),
  (
    'sadness_comfort_1',
    'You Are Not Alone',
    'Comforting words and validation for times of deep sadness',
    'https://example.com/tavus/sadness_comfort_1.mp4',
    'https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=300&w=400',
    150,
    'sad'
  ),
  (
    'sadness_validation_1',
    'Your Feelings Are Valid',
    'Validation and understanding for grief and sadness',
    'https://example.com/tavus/sadness_validation_1.mp4',
    'https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=300&w=400',
    135,
    'sad'
  ),
  (
    'crisis_support_1',
    'You Matter and You Are Loved',
    'Crisis support with immediate comfort and hope',
    'https://example.com/tavus/crisis_support_1.mp4',
    'https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=300&w=400',
    200,
    'hopeless'
  ),
  (
    'loneliness_connection_1',
    'Finding Connection',
    'Support for feelings of loneliness and isolation',
    'https://example.com/tavus/loneliness_connection_1.mp4',
    'https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=300&w=400',
    165,
    'lonely'
  )
ON CONFLICT (id) DO NOTHING;

-- Create triggers for updated_at
CREATE TRIGGER update_rant_sessions_updated_at
  BEFORE UPDATE ON rant_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rant_sessions_user_id ON rant_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_rant_sessions_created_at ON rant_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_rant_sessions_emotion ON rant_sessions(detected_emotion);
CREATE INDEX IF NOT EXISTS idx_tavus_videos_emotion ON tavus_videos(emotion_category);