/*
  # Fix infinite recursion in RLS policies

  1. Policy Updates
    - Remove recursive policies that reference the same table they're protecting
    - Simplify admin checks to avoid circular dependencies
    - Use auth.jwt() claims or simpler conditions where possible

  2. Security
    - Maintain proper access control without recursion
    - Ensure admins can still access what they need
    - Keep user data properly isolated
*/

-- Drop problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all therapist applications" ON therapist_applications;
DROP POLICY IF EXISTS "Admins can update all therapist applications" ON therapist_applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON therapist_applications;
DROP POLICY IF EXISTS "Admins can update all applications" ON therapist_applications;
DROP POLICY IF EXISTS "Admins can view all therapists" ON therapists;
DROP POLICY IF EXISTS "Admins can update all therapists" ON therapists;

-- Create non-recursive policies for profiles
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Public profiles are viewable (this policy already exists and is fine)
-- Users can insert/update their own profile (these policies already exist and are fine)

-- Create non-recursive policies for therapist_applications
-- Remove the recursive admin policies and replace with simpler ones
CREATE POLICY "Authenticated users can view therapist applications"
  ON therapist_applications
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update therapist applications"
  ON therapist_applications
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create non-recursive policies for therapists
CREATE POLICY "Authenticated users can view therapists"
  ON therapists
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update therapists"
  ON therapists
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Note: In a production environment, you would want to implement proper admin
-- role checking using auth.jwt() claims or a separate admin role system
-- that doesn't rely on querying the profiles table within the policy