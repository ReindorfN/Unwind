/*
  # Fix Profile RLS Policy for Signup

  1. Security Updates
    - Update the INSERT policy for profiles table to properly handle signup flow
    - Ensure authenticated users can create their own profile during signup
    - Fix the policy to work with the auth.uid() function correctly

  2. Changes
    - Modify the INSERT policy to use authenticated role instead of public
    - Ensure the policy allows profile creation during the signup process
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create a new INSERT policy that works properly with signup
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Also ensure the profiles table has proper RLS enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Update the SELECT policy to also work for authenticated users
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles
  FOR SELECT
  TO public
  USING (true);

-- Ensure authenticated users can also select profiles
CREATE POLICY "Authenticated users can view profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);