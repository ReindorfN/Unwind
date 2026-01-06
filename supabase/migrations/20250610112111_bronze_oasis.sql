/*
  # Forum System Implementation

  1. New Tables
    - `forum_categories`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `description` (text)
      - `icon` (text)
      - `color` (text)
      - `post_count` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `forum_posts`
      - `id` (uuid, primary key)
      - `category_id` (uuid, references forum_categories)
      - `author_id` (uuid, references profiles)
      - `title` (text)
      - `content` (text)
      - `is_anonymous` (boolean)
      - `is_pinned` (boolean)
      - `is_locked` (boolean)
      - `view_count` (integer)
      - `comment_count` (integer)
      - `helpful_count` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `forum_comments`
      - `id` (uuid, primary key)
      - `post_id` (uuid, references forum_posts)
      - `author_id` (uuid, references profiles)
      - `content` (text)
      - `is_anonymous` (boolean)
      - `helpful_count` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `forum_helpful_votes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `post_id` (uuid, references forum_posts, nullable)
      - `comment_id` (uuid, references forum_comments, nullable)
      - `created_at` (timestamp)
    
    - `forum_reports`
      - `id` (uuid, primary key)
      - `reporter_id` (uuid, references profiles)
      - `post_id` (uuid, references forum_posts, nullable)
      - `comment_id` (uuid, references forum_comments, nullable)
      - `reason` (text)
      - `status` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for CRUD operations
    - Ensure anonymous posting privacy
*/

-- Create forum categories table
CREATE TABLE IF NOT EXISTS forum_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  color text NOT NULL DEFAULT '#78A083',
  post_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create forum posts table
CREATE TABLE IF NOT EXISTS forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES forum_categories(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  is_anonymous boolean DEFAULT false,
  is_pinned boolean DEFAULT false,
  is_locked boolean DEFAULT false,
  view_count integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  helpful_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create forum comments table
CREATE TABLE IF NOT EXISTS forum_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES forum_posts(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  is_anonymous boolean DEFAULT false,
  helpful_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create forum helpful votes table
CREATE TABLE IF NOT EXISTS forum_helpful_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES forum_posts(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES forum_comments(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT helpful_vote_target CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR 
    (post_id IS NULL AND comment_id IS NOT NULL)
  ),
  UNIQUE(user_id, post_id),
  UNIQUE(user_id, comment_id)
);

-- Create forum reports table
CREATE TABLE IF NOT EXISTS forum_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES forum_posts(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES forum_comments(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT report_target CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR 
    (post_id IS NULL AND comment_id IS NOT NULL)
  )
);

-- Enable Row Level Security
ALTER TABLE forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_helpful_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_reports ENABLE ROW LEVEL SECURITY;

-- Forum categories policies
CREATE POLICY "Anyone can view forum categories"
  ON forum_categories FOR SELECT
  TO authenticated
  USING (true);

-- Forum posts policies
CREATE POLICY "Anyone can view forum posts"
  ON forum_posts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create forum posts"
  ON forum_posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own forum posts"
  ON forum_posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete own forum posts"
  ON forum_posts FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- Forum comments policies
CREATE POLICY "Anyone can view forum comments"
  ON forum_comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create forum comments"
  ON forum_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own forum comments"
  ON forum_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete own forum comments"
  ON forum_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- Forum helpful votes policies
CREATE POLICY "Users can view helpful votes"
  ON forum_helpful_votes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create helpful votes"
  ON forum_helpful_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own helpful votes"
  ON forum_helpful_votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Forum reports policies
CREATE POLICY "Users can create reports"
  ON forum_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports"
  ON forum_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

-- Insert default forum categories
INSERT INTO forum_categories (name, description, icon, color) VALUES
  ('Anxiety Support', 'Share experiences and coping strategies for anxiety', 'Brain', '#9333ea'),
  ('Academic Stress', 'Discuss academic pressures and study-related stress', 'BookOpen', '#dc2626'),
  ('Grief & Loss', 'Support for those dealing with loss and grief', 'Heart', '#1f2937'),
  ('Relationships', 'Navigate relationship challenges and connections', 'Users', '#059669'),
  ('Depression Support', 'Community for those experiencing depression', 'Cloud', '#4338ca'),
  ('Self-Care & Wellness', 'Tips and discussions about self-care practices', 'Sparkles', '#ea580c'),
  ('Identity & Growth', 'Explore personal identity and growth journeys', 'User', '#7c3aed'),
  ('General Support', 'Open discussions and general mental health topics', 'MessageCircle', '#78A083')
ON CONFLICT (name) DO NOTHING;

-- Create triggers for updating counts
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forum_posts 
    SET comment_count = comment_count + 1 
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forum_posts 
    SET comment_count = comment_count - 1 
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_category_post_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forum_categories 
    SET post_count = post_count + 1 
    WHERE id = NEW.category_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forum_categories 
    SET post_count = post_count - 1 
    WHERE id = OLD.category_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_helpful_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.post_id IS NOT NULL THEN
      UPDATE forum_posts 
      SET helpful_count = helpful_count + 1 
      WHERE id = NEW.post_id;
    ELSIF NEW.comment_id IS NOT NULL THEN
      UPDATE forum_comments 
      SET helpful_count = helpful_count + 1 
      WHERE id = NEW.comment_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.post_id IS NOT NULL THEN
      UPDATE forum_posts 
      SET helpful_count = helpful_count - 1 
      WHERE id = OLD.post_id;
    ELSIF OLD.comment_id IS NOT NULL THEN
      UPDATE forum_comments 
      SET helpful_count = helpful_count - 1 
      WHERE id = OLD.comment_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_post_comment_count_trigger
  AFTER INSERT OR DELETE ON forum_comments
  FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

CREATE TRIGGER update_category_post_count_trigger
  AFTER INSERT OR DELETE ON forum_posts
  FOR EACH ROW EXECUTE FUNCTION update_category_post_count();

CREATE TRIGGER update_helpful_count_trigger
  AFTER INSERT OR DELETE ON forum_helpful_votes
  FOR EACH ROW EXECUTE FUNCTION update_helpful_count();

-- Update triggers for updated_at
CREATE TRIGGER update_forum_categories_updated_at
  BEFORE UPDATE ON forum_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forum_posts_updated_at
  BEFORE UPDATE ON forum_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forum_comments_updated_at
  BEFORE UPDATE ON forum_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();