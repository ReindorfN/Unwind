/*
  # Therapist Availability and Appointments System

  1. New Tables
    - `therapist_availability`
      - `id` (uuid, primary key)
      - `therapist_id` (uuid, foreign key to therapists)
      - `day_of_week` (integer, 0-6 for Sunday-Saturday)
      - `start_time` (time)
      - `end_time` (time)
      - `is_available` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `appointments`
      - `id` (uuid, primary key)
      - `therapist_id` (uuid, foreign key to therapists)
      - `client_id` (uuid, foreign key to profiles)
      - `date` (date)
      - `start_time` (time)
      - `end_time` (time)
      - `status` (text, enum)
      - `type` (text, enum)
      - `format` (text, enum)
      - `notes` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Enhanced Therapist Table
    - Added professional fields (bio, education, approaches, languages)
    - Added session information (fee, length, format options)
    - Added payment and insurance options

  3. Security
    - Enable RLS on new tables
    - Add policies for therapists and clients
    - Add triggers for data validation
*/

-- Add additional fields to therapists table
DO $$
BEGIN
  -- Add bio column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'therapists' AND column_name = 'bio'
  ) THEN
    ALTER TABLE therapists ADD COLUMN bio text;
  END IF;

  -- Add education column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'therapists' AND column_name = 'education'
  ) THEN
    ALTER TABLE therapists ADD COLUMN education text;
  END IF;

  -- Add session_fee column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'therapists' AND column_name = 'session_fee'
  ) THEN
    ALTER TABLE therapists ADD COLUMN session_fee numeric(10,2) DEFAULT 100.00;
  END IF;

  -- Add session_length column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'therapists' AND column_name = 'session_length'
  ) THEN
    ALTER TABLE therapists ADD COLUMN session_length integer DEFAULT 50;
  END IF;

  -- Add approaches column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'therapists' AND column_name = 'approaches'
  ) THEN
    ALTER TABLE therapists ADD COLUMN approaches text[] DEFAULT '{"Cognitive Behavioral Therapy"}';
  END IF;

  -- Add languages column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'therapists' AND column_name = 'languages'
  ) THEN
    ALTER TABLE therapists ADD COLUMN languages text[] DEFAULT '{"English"}';
  END IF;

  -- Add insurance_accepted column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'therapists' AND column_name = 'insurance_accepted'
  ) THEN
    ALTER TABLE therapists ADD COLUMN insurance_accepted boolean DEFAULT false;
  END IF;

  -- Add sliding_scale column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'therapists' AND column_name = 'sliding_scale'
  ) THEN
    ALTER TABLE therapists ADD COLUMN sliding_scale boolean DEFAULT false;
  END IF;

  -- Add virtual_sessions column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'therapists' AND column_name = 'virtual_sessions'
  ) THEN
    ALTER TABLE therapists ADD COLUMN virtual_sessions boolean DEFAULT true;
  END IF;

  -- Add in_person_sessions column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'therapists' AND column_name = 'in_person_sessions'
  ) THEN
    ALTER TABLE therapists ADD COLUMN in_person_sessions boolean DEFAULT false;
  END IF;
END $$;

-- Create therapist_availability table
CREATE TABLE IF NOT EXISTS therapist_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid REFERENCES therapists(id) ON DELETE CASCADE NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid REFERENCES therapists(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no-show')),
  type text NOT NULL DEFAULT 'follow-up' CHECK (type IN ('initial', 'follow-up', 'crisis')),
  format text NOT NULL DEFAULT 'video' CHECK (format IN ('video', 'phone', 'in-person')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_appointment_time_range CHECK (start_time < end_time)
);

-- Enable Row Level Security
ALTER TABLE therapist_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Therapist availability policies
CREATE POLICY "Therapists can view own availability"
  ON therapist_availability FOR SELECT
  TO authenticated
  USING (auth.uid() = therapist_id);

CREATE POLICY "Therapists can create own availability"
  ON therapist_availability FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = therapist_id AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'therapist'
    )
  );

CREATE POLICY "Therapists can update own availability"
  ON therapist_availability FOR UPDATE
  TO authenticated
  USING (auth.uid() = therapist_id)
  WITH CHECK (auth.uid() = therapist_id);

CREATE POLICY "Therapists can delete own availability"
  ON therapist_availability FOR DELETE
  TO authenticated
  USING (auth.uid() = therapist_id);

-- Appointment policies
CREATE POLICY "Therapists can view own appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (
    auth.uid() = therapist_id OR
    auth.uid() = client_id
  );

CREATE POLICY "Therapists can create appointments"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = therapist_id AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'therapist'
    )
  );

CREATE POLICY "Therapists can update own appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (auth.uid() = therapist_id)
  WITH CHECK (auth.uid() = therapist_id);

CREATE POLICY "Clients can cancel appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_therapist_availability_therapist_id ON therapist_availability(therapist_id);
CREATE INDEX IF NOT EXISTS idx_therapist_availability_day_of_week ON therapist_availability(day_of_week);
CREATE INDEX IF NOT EXISTS idx_appointments_therapist_id ON appointments(therapist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- Create triggers for updated_at
CREATE TRIGGER update_therapist_availability_updated_at
  BEFORE UPDATE ON therapist_availability
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check if appointment conflicts with existing appointments
CREATE OR REPLACE FUNCTION check_appointment_availability()
RETURNS trigger AS $$
BEGIN
  -- Check if the therapist is available at the requested time
  IF NOT EXISTS (
    SELECT 1 FROM therapist_availability
    WHERE therapist_id = NEW.therapist_id
      AND day_of_week = EXTRACT(DOW FROM NEW.date)::integer
      AND start_time <= NEW.start_time
      AND end_time >= NEW.end_time
      AND is_available = true
  ) THEN
    RAISE EXCEPTION 'Therapist is not available at the requested time';
  END IF;

  -- Check for conflicts with existing appointments (only for scheduled appointments)
  IF NEW.status = 'scheduled' AND EXISTS (
    SELECT 1 FROM appointments
    WHERE therapist_id = NEW.therapist_id
      AND date = NEW.date
      AND status = 'scheduled'
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND (
        (start_time <= NEW.start_time AND end_time > NEW.start_time) OR
        (start_time < NEW.end_time AND end_time >= NEW.end_time) OR
        (start_time >= NEW.start_time AND end_time <= NEW.end_time)
      )
  ) THEN
    RAISE EXCEPTION 'Appointment conflicts with an existing appointment';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for appointment availability check
CREATE TRIGGER check_appointment_availability_trigger
  BEFORE INSERT OR UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION check_appointment_availability();