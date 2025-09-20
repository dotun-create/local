-- Migration to add timezone tracking columns to core tables
-- Run this against PostgreSQL database
-- Date: 2024-09-14

-- Add timezone tracking columns to sessions table
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS created_timezone VARCHAR(50) DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS browser_timezone VARCHAR(50) DEFAULT 'UTC';

-- Add comments for sessions table
COMMENT ON COLUMN sessions.created_timezone IS 'IANA timezone of user when session was created';
COMMENT ON COLUMN sessions.browser_timezone IS 'Browser-detected timezone when session was created';
COMMENT ON COLUMN sessions.timezone IS 'Session timezone (existing column for reference)';

-- Add timezone tracking columns to availability table
ALTER TABLE availability
ADD COLUMN IF NOT EXISTS created_timezone VARCHAR(50) DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS browser_timezone VARCHAR(50) DEFAULT 'UTC';

-- Add comments for availability table
COMMENT ON COLUMN availability.created_timezone IS 'IANA timezone of tutor when availability was created';
COMMENT ON COLUMN availability.browser_timezone IS 'Browser-detected timezone when availability was created';
COMMENT ON COLUMN availability.time_zone IS 'Availability timezone (existing column for reference)';

-- Add timezone tracking columns to enrollments table
ALTER TABLE enrollments
ADD COLUMN IF NOT EXISTS enrolled_timezone VARCHAR(50) DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS approved_timezone VARCHAR(50) DEFAULT 'UTC';

-- Add comments for enrollments table
COMMENT ON COLUMN enrollments.enrolled_timezone IS 'IANA timezone when enrollment occurred';
COMMENT ON COLUMN enrollments.approved_timezone IS 'IANA timezone when enrollment was approved';

-- Add timezone tracking columns to quiz_results table
ALTER TABLE quiz_results
ADD COLUMN IF NOT EXISTS completed_timezone VARCHAR(50) DEFAULT 'UTC';

-- Add comments for quiz_results table
COMMENT ON COLUMN quiz_results.completed_timezone IS 'IANA timezone when quiz was completed';

-- Create indexes for timezone queries (performance optimization)
CREATE INDEX IF NOT EXISTS idx_sessions_created_timezone ON sessions(created_timezone);
CREATE INDEX IF NOT EXISTS idx_availability_created_timezone ON availability(created_timezone);
CREATE INDEX IF NOT EXISTS idx_enrollments_enrolled_timezone ON enrollments(enrolled_timezone);
CREATE INDEX IF NOT EXISTS idx_quiz_results_completed_timezone ON quiz_results(completed_timezone);

-- Migration notes:
-- 1. All new columns have DEFAULT 'UTC' to handle existing records
-- 2. Existing records will have 'UTC' for timezone tracking columns
-- 3. New records will populate actual timezone values from API requests
-- 4. These columns provide timezone audit trail for debugging date issues
-- 5. All timezone values should be valid IANA timezone strings (e.g., 'America/New_York')