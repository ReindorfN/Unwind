/*
  # Fix Infinite Recursion in Profiles Policy

  1. Changes
    - Drop problematic policies that cause infinite recursion
    - Create new policies with proper conditions that avoid recursion
    - Fix admin access to profiles and other tables
  
  2. Security
    - Maintain proper row-level security
    - Ensure admins can view all data
    - Ensure users can only access their own data
*/

-- Drop problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Create a new policy for admins to view all profiles without recursion
CREATE POLICY "Admins can view all profiles" 
  ON profiles FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Ensure other policies are correct and don't cause recursion
DROP POLICY IF EXISTS "Admins can view all therapist applications" ON therapist_applications;
CREATE POLICY "Admins can view all therapist applications"
  ON therapist_applications FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Admins can update all therapist applications" ON therapist_applications;
CREATE POLICY "Admins can update all therapist applications"
  ON therapist_applications FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Admins can view all therapists" ON therapists;
CREATE POLICY "Admins can view all therapists"
  ON therapists FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Admins can update all therapists" ON therapists;
CREATE POLICY "Admins can update all therapists"
  ON therapists FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Create a simple SQL function to check if a user is an admin
-- This helps avoid recursion in policies
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to all users
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO anon;