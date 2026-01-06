import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  //"https://mrpatoainbjmisnfayyz.supabase.co" 
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY; //"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ycGF0b2FpbmJqbWlzbmZheXl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4OTU4MjcsImV4cCI6MjA2NDQ3MTgyN30.02HAVactc-h7FmNkI6SCXUlNMeXu215-DW_LqZ2x3W0" 

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'user' | 'therapist' | 'admin';
  created_at: string;
  updated_at: string;
};

export type Therapist = {
  id: string;
  specialization: string | null;
  license_number: string | null;
  bio: string | null;
  education: string | null;
  years_experience: number;
  session_fee: number;
  session_length: number;
  approaches: string[];
  languages: string[];
  insurance_accepted: boolean;
  sliding_scale: boolean;
  virtual_sessions: boolean;
  in_person_sessions: boolean;
  verified: boolean;
  created_at: string;
  updated_at: string;
};

export type UserSettings = {
  user_id: string;
  notification_preferences: {
    email: boolean;
    push: boolean;
  };
  privacy_settings: {
    profile_visible: boolean;
  };
  theme_preference: 'light' | 'dark';
  created_at: string;
  updated_at: string;
};

export type RantSession = {
  id: string;
  user_id: string;
  input_text: string;
  input_audio_url?: string;
  detected_emotion: string;
  confidence_score: number;
  video_response_id: string;
  mood_before?: number;
  mood_after?: number;
  created_at: string;
  updated_at: string;
};

export type EmotionCategory = {
  id: string;
  name: string;
  keywords: string[];
  video_ids: string[];
  color: string;
  description: string;
  created_at: string;
};

export type TavusVideo = {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  duration: number;
  emotion_category: string;
  created_at: string;
};