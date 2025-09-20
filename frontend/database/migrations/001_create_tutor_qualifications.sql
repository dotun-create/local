-- Migration: Create Tutor Qualifications System
-- Date: 2024-12-15
-- Description: Database schema for multi-role tutor qualification management and bulk import

-- Tutor Qualifications Table
CREATE TABLE IF NOT EXISTS tutor_qualifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    course_id UUID NOT NULL,
    qualification_type VARCHAR(20) NOT NULL CHECK (qualification_type IN ('automatic', 'manual', 'bulk_import')),
    score INTEGER CHECK (score >= 0 AND score <= 100),
    qualified_at TIMESTAMP DEFAULT NOW(),
    qualified_by UUID, -- Admin who approved (optional for automatic)
    is_active BOOLEAN DEFAULT TRUE,
    revoked_at TIMESTAMP NULL,
    revoke_reason TEXT NULL,
    revoked_by UUID NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Constraints
    UNIQUE(user_id, course_id), -- One qualification per user per course
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (qualified_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (revoked_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Course Settings Table
CREATE TABLE IF NOT EXISTS course_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL UNIQUE,
    min_score_to_tutor INTEGER DEFAULT 85 CHECK (min_score_to_tutor >= 0 AND min_score_to_tutor <= 100),
    max_students_per_tutor INTEGER DEFAULT 10 CHECK (max_students_per_tutor > 0),
    auto_qualify BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Constraints
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- Bulk Import Jobs Table
CREATE TABLE IF NOT EXISTS bulk_import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    imported_by UUID NOT NULL,
    job_status VARCHAR(20) NOT NULL DEFAULT 'processing' CHECK (job_status IN ('processing', 'completed', 'failed', 'cancelled')),
    total_records INTEGER DEFAULT 0,
    successful_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    error_details JSONB DEFAULT '[]'::jsonb,
    file_name VARCHAR(255),
    file_size INTEGER,
    processing_started_at TIMESTAMP DEFAULT NOW(),
    processing_completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Constraints
    FOREIGN KEY (imported_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Qualification History Table (for audit trail)
CREATE TABLE IF NOT EXISTS qualification_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qualification_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('created', 'updated', 'revoked', 'restored')),
    changed_by UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),

    -- Constraints
    FOREIGN KEY (qualification_id) REFERENCES tutor_qualifications(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tutor_qualifications_user_id ON tutor_qualifications(user_id);
CREATE INDEX IF NOT EXISTS idx_tutor_qualifications_course_id ON tutor_qualifications(course_id);
CREATE INDEX IF NOT EXISTS idx_tutor_qualifications_active ON tutor_qualifications(is_active);
CREATE INDEX IF NOT EXISTS idx_tutor_qualifications_type ON tutor_qualifications(qualification_type);
CREATE INDEX IF NOT EXISTS idx_course_settings_course_id ON course_settings(course_id);
CREATE INDEX IF NOT EXISTS idx_bulk_import_jobs_status ON bulk_import_jobs(job_status);
CREATE INDEX IF NOT EXISTS idx_bulk_import_jobs_imported_by ON bulk_import_jobs(imported_by);
CREATE INDEX IF NOT EXISTS idx_qualification_history_qualification_id ON qualification_history(qualification_id);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tutor_qualifications_updated_at BEFORE UPDATE ON tutor_qualifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_course_settings_updated_at BEFORE UPDATE ON course_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bulk_import_jobs_updated_at BEFORE UPDATE ON bulk_import_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default course settings for existing courses
INSERT INTO course_settings (course_id, min_score_to_tutor, max_students_per_tutor, auto_qualify)
SELECT
    id as course_id,
    85 as min_score_to_tutor,
    10 as max_students_per_tutor,
    true as auto_qualify
FROM courses
WHERE id NOT IN (SELECT course_id FROM course_settings)
ON CONFLICT (course_id) DO NOTHING;