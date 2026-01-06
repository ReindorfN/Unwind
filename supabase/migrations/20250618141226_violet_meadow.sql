/*
  # Therapist Verification System

  1. Functions
    - `approve_therapist_application` - Approve a therapist application
    - `reject_therapist_application` - Reject a therapist application  
    - `verify_therapist` - Manually verify a therapist

  2. Views
    - `therapist_applications_view` - Admin view of all applications

  3. Security
    - Functions are security definer and check admin role
    - View relies on underlying table RLS policies
*/

-- Function to approve a therapist application
CREATE OR REPLACE FUNCTION approve_therapist_application(application_id UUID)
RETURNS VOID AS $$
DECLARE
  app_user_id UUID;
BEGIN
  -- Check if the current user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only administrators can approve therapist applications';
  END IF;

  -- Get the user_id from the application
  SELECT user_id INTO app_user_id FROM therapist_applications
  WHERE id = application_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  -- Update application status
  UPDATE therapist_applications
  SET 
    application_status = 'approved',
    reviewed_at = NOW()
  WHERE id = application_id;

  -- Update therapist record to be verified
  UPDATE therapists
  SET verified = TRUE
  WHERE id = app_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject a therapist application
CREATE OR REPLACE FUNCTION reject_therapist_application(application_id UUID, rejection_reason TEXT)
RETURNS VOID AS $$
DECLARE
  app_user_id UUID;
BEGIN
  -- Check if the current user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only administrators can reject therapist applications';
  END IF;

  -- Get the user_id from the application
  SELECT user_id INTO app_user_id FROM therapist_applications
  WHERE id = application_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  -- Update application status
  UPDATE therapist_applications
  SET 
    application_status = 'rejected',
    admin_notes = rejection_reason,
    reviewed_at = NOW()
  WHERE id = application_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to manually verify a therapist
CREATE OR REPLACE FUNCTION verify_therapist(therapist_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Check if the current user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only administrators can verify therapists';
  END IF;

  -- Check if the user exists and is a therapist
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = therapist_user_id AND role = 'therapist'
  ) THEN
    RAISE EXCEPTION 'User not found or not a therapist';
  END IF;

  -- Update therapist record to be verified
  UPDATE therapists
  SET verified = TRUE
  WHERE id = therapist_user_id;

  -- Update any pending applications
  UPDATE therapist_applications
  SET 
    application_status = 'approved',
    reviewed_at = NOW()
  WHERE user_id = therapist_user_id AND application_status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view for admin dashboard to see pending applications
CREATE OR REPLACE VIEW therapist_applications_view AS
SELECT 
  ta.id,
  ta.user_id,
  p.full_name,
  p.email,
  ta.specialization,
  ta.license_number,
  ta.license_state,
  ta.years_experience,
  ta.education,
  ta.certifications,
  ta.certificate_image_url,
  ta.application_status,
  ta.admin_notes,
  ta.submitted_at,
  ta.reviewed_at
FROM 
  therapist_applications ta
JOIN 
  profiles p ON ta.user_id = p.id
ORDER BY 
  CASE 
    WHEN ta.application_status = 'pending' THEN 1
    WHEN ta.application_status = 'under_review' THEN 2
    WHEN ta.application_status = 'approved' THEN 3
    WHEN ta.application_status = 'rejected' THEN 4
  END,
  ta.submitted_at DESC;

-- Grant usage on the functions to authenticated users (admin check is inside the function)
GRANT EXECUTE ON FUNCTION approve_therapist_application(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_therapist_application(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_therapist(UUID) TO authenticated;