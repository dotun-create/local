-- Migration to add timezone support columns to existing tables
-- Run this against PostgreSQL database

-- Add timezone columns to recurring availability table
ALTER TABLE recurring_availability 
ADD COLUMN original_timezone VARCHAR(50),
ADD COLUMN original_start_time TIME,
ADD COLUMN original_end_time TIME;

-- Add comment for documentation
COMMENT ON COLUMN recurring_availability.original_timezone IS 'IANA timezone string (e.g., America/Chicago) representing user timezone when creating session';
COMMENT ON COLUMN recurring_availability.original_start_time IS 'Original start time in user local timezone for display purposes';
COMMENT ON COLUMN recurring_availability.original_end_time IS 'Original end time in user local timezone for display purposes';

-- Add timezone columns to single availability table (if exists)
-- Note: Adjust table name based on actual schema
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tutor_availability') THEN
        ALTER TABLE tutor_availability 
        ADD COLUMN IF NOT EXISTS original_timezone VARCHAR(50),
        ADD COLUMN IF NOT EXISTS original_start_time TIME,
        ADD COLUMN IF NOT EXISTS original_end_time TIME;
        
        -- Add comments
        COMMENT ON COLUMN tutor_availability.original_timezone IS 'IANA timezone string representing user timezone when creating session';
        COMMENT ON COLUMN tutor_availability.original_start_time IS 'Original start time in user local timezone for display purposes';
        COMMENT ON COLUMN tutor_availability.original_end_time IS 'Original end time in user local timezone for display purposes';
    END IF;
END
$$;

-- Create index for timezone queries (optional performance optimization)
CREATE INDEX IF NOT EXISTS idx_recurring_availability_timezone ON recurring_availability(original_timezone);

-- Migration notes:
-- 1. Existing sessions will have NULL values for new columns (this is expected)
-- 2. start_time and end_time columns remain as UTC for backward compatibility
-- 3. New sessions will populate both UTC times (for consistency) and original times (for display)
-- 4. Applications can detect timezone-aware sessions by checking if original_timezone IS NOT NULL