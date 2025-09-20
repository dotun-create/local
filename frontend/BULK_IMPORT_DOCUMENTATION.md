# CSV Bulk Import System Documentation

## Overview

The CSV Bulk Import System allows administrators to efficiently convert existing students into tutors using a "simulated achievement" approach. This system supports both text-based CSV input and file uploads, with comprehensive validation, error handling, and progress tracking.

## Features

### 🎯 Core Functionality
- **Dual Input Methods**: Paste CSV text directly or upload CSV files
- **Real-time Validation**: Immediate feedback on CSV format and data validity
- **Dry Run Mode**: Preview import results before actual processing
- **Progress Tracking**: Visual indicators for import status and completion
- **Error Handling**: Detailed error reporting with specific failure reasons
- **Import History**: Track and monitor previous import jobs

### 🔒 Security & Validation
- **Admin-Only Access**: Restricted to authenticated admin users
- **File Type Validation**: Only CSV files accepted
- **File Size Limits**: Maximum 5MB file size
- **Data Sanitization**: All input data is validated and sanitized
- **Transaction Safety**: Database operations use transactions for consistency

### 📊 Monitoring & Reporting
- **Real-time Progress**: Visual progress indicators during processing
- **Detailed Results**: Success/failure counts with specific error messages
- **Import History**: Historical view of all import jobs
- **Audit Trail**: Complete logging of all qualification changes

## System Architecture

### Database Schema

```sql
-- Tutor Qualifications Table
CREATE TABLE tutor_qualifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    course_id UUID NOT NULL,
    qualification_type VARCHAR(20) CHECK (qualification_type IN ('automatic', 'manual', 'bulk_import')),
    score INTEGER CHECK (score >= 0 AND score <= 100),
    qualified_at TIMESTAMP DEFAULT NOW(),
    qualified_by UUID,
    is_active BOOLEAN DEFAULT TRUE,
    revoked_at TIMESTAMP NULL,
    revoke_reason TEXT NULL,
    notes TEXT,
    UNIQUE(user_id, course_id)
);

-- Course Settings Table
CREATE TABLE course_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL UNIQUE,
    min_score_to_tutor INTEGER DEFAULT 85,
    max_students_per_tutor INTEGER DEFAULT 10,
    auto_qualify BOOLEAN DEFAULT TRUE
);

-- Bulk Import Jobs Table
CREATE TABLE bulk_import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    imported_by UUID NOT NULL,
    job_status VARCHAR(20) DEFAULT 'processing',
    total_records INTEGER DEFAULT 0,
    successful_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    error_details JSONB DEFAULT '[]'::jsonb,
    file_name VARCHAR(255),
    processing_started_at TIMESTAMP DEFAULT NOW(),
    processing_completed_at TIMESTAMP NULL
);
```

### API Endpoints

#### Course Settings Management
```javascript
GET    /api/admin/courses/settings              // Get all course settings
GET    /api/admin/courses/:courseId/settings    // Get specific course settings
PUT    /api/admin/courses/:courseId/settings    // Update course settings
```

#### Tutor Qualification Management
```javascript
GET    /api/admin/tutors/qualifications         // Get all qualifications (with filters)
POST   /api/admin/tutors/qualify                // Manually qualify a tutor
DELETE /api/admin/tutors/qualifications/:id     // Revoke qualification
POST   /api/admin/tutors/qualifications/:id/restore // Restore qualification
```

#### Bulk Import Operations
```javascript
POST   /api/admin/tutors/bulk-import            // Process CSV text data
POST   /api/admin/tutors/bulk-import-file       // Process CSV file upload
POST   /api/admin/tutors/validate-csv           // Validate CSV data
GET    /api/admin/bulk-import-jobs              // Get import job history
GET    /api/admin/bulk-import-jobs/:jobId       // Get specific job status
POST   /api/admin/bulk-import-jobs/:jobId/cancel // Cancel running job
```

## CSV Format Specification

### Required Format
```csv
email,course_id,score,qualification_date
student1@example.com,course-1,92,2024-01-15
student2@example.com,course-2,88,2024-01-10
student3@example.com,course-1,95,2024-01-12
```

### Field Specifications

| Field | Type | Required | Validation Rules |
|-------|------|----------|------------------|
| `email` | String | Yes | Valid email format, must exist in system |
| `course_id` | String | Yes | Must be valid course ID |
| `score` | Integer | Yes | Range: 0-100 |
| `qualification_date` | Date | Yes | Format: YYYY-MM-DD, not future date |

### Validation Rules

#### Email Validation
- Must be valid email format (RFC 5322 compliant)
- Must correspond to existing user in the system
- User must have 'student' role or be convertible to multi-role

#### Course Validation
- Course ID must exist in the courses table
- Course must be active and available for qualification
- Course settings must be configured

#### Score Validation
- Must be integer between 0 and 100
- Must meet or exceed course's `min_score_to_tutor` threshold
- Used to determine automatic qualification eligibility

#### Date Validation
- Must be valid date in YYYY-MM-DD format
- Cannot be future date
- Must be reasonable (not before system launch)

## Usage Guide

### Accessing the Bulk Import Feature

1. **Login as Admin**: Must have admin privileges
2. **Navigate to Admin Panel**: Go to admin section
3. **Select Multi-Role Management**: Click on the multi-role sidebar option
4. **Click Bulk Import Tab**: Switch to the bulk import interface

### Import Methods

#### Method 1: Text Input
1. Select "Paste CSV Text" option
2. Paste CSV data into the text area
3. Configure import options as needed
4. Click "Process Import" or "Preview Import"

#### Method 2: File Upload
1. Select "Upload CSV File" option
2. Click file input and select CSV file
3. File is automatically validated and previewed
4. Configure import options as needed
5. Click "Process Import" or "Preview Import"

### Import Options

#### Dry Run Mode
- **Purpose**: Preview results without making changes
- **Benefits**: Validate data and see potential issues
- **Usage**: Check "Preview Only (Dry Run)" before processing

#### Skip Existing Qualifications
- **Purpose**: Avoid errors for already-qualified users
- **Benefits**: Allows re-running imports safely
- **Usage**: Check "Skip Existing Qualifications"

#### Auto-Qualify Based on Scores
- **Purpose**: Automatically qualify users who meet score thresholds
- **Benefits**: Streamlines the qualification process
- **Usage**: Check "Auto-Qualify Based on Scores" (default: enabled)

#### Notification Email
- **Purpose**: Send completion notifications to specified email
- **Benefits**: Stay informed about long-running imports
- **Usage**: Enter valid email address in notification field

### Monitoring Import Progress

#### Progress Indicators
- **Validating**: CSV data is being validated
- **Processing**: Import is running
- **Completed**: Import finished successfully
- **Error**: Import failed with errors
- **Preview**: Dry run completed

#### Results Display
- **Summary Cards**: Total, successful, and failed counts
- **Error Details**: Specific error messages for failed records
- **Success List**: Successfully qualified users
- **Warnings**: Non-critical issues that were handled

### Import History

The system maintains a complete history of all import jobs:
- **Job Status**: Current state of each import
- **Record Counts**: Total, successful, and failed records
- **Timestamps**: When jobs were started and completed
- **File Information**: Original file names and sizes

## Error Handling

### Common Validation Errors

#### Email Errors
```
"Invalid email format: invalid-email"
"User not found: nonexistent@example.com"
"User is not a student: admin@example.com"
```

#### Course Errors
```
"Course not found: invalid-course-id"
"Course is inactive: archived-course"
"Course settings not configured: new-course"
```

#### Score Errors
```
"Score out of range: 150 (must be 0-100)"
"Score below threshold: 70 (minimum: 85)"
"Invalid score format: abc"
```

#### Date Errors
```
"Invalid date format: 2024/01/15 (use YYYY-MM-DD)"
"Future date not allowed: 2025-01-01"
"Date too old: 2020-01-01"
```

### System Errors

#### File Upload Errors
```
"File size too large: 10MB (maximum: 5MB)"
"Invalid file type: .xlsx (only .csv allowed)"
"File read error: corrupted file"
```

#### Database Errors
```
"Database connection failed"
"Transaction timeout"
"Constraint violation: duplicate qualification"
```

#### API Errors
```
"Authentication required"
"Insufficient permissions"
"Rate limit exceeded"
```

## Best Practices

### Data Preparation

1. **Clean Your Data**
   - Remove duplicate entries
   - Verify email addresses
   - Ensure course IDs are correct
   - Validate score ranges

2. **Use Dry Run First**
   - Always preview before actual import
   - Review all warnings and errors
   - Adjust data as needed

3. **Start Small**
   - Test with small batches first
   - Gradually increase batch sizes
   - Monitor system performance

### Performance Optimization

1. **Batch Sizing**
   - Recommended: 100-500 records per batch
   - Maximum: 1000 records per batch
   - Monitor processing time

2. **Timing**
   - Run large imports during off-peak hours
   - Avoid concurrent large operations
   - Monitor system resources

3. **Data Quality**
   - Pre-validate data externally
   - Remove obvious errors
   - Use consistent formatting

### Security Considerations

1. **Access Control**
   - Only grant admin access to trusted users
   - Regularly audit admin permissions
   - Monitor import activities

2. **Data Privacy**
   - Ensure compliance with privacy regulations
   - Validate data sources
   - Secure file transfers

3. **Audit Trail**
   - All imports are logged
   - Changes are tracked
   - History is preserved

## Troubleshooting

### Common Issues

#### Import Fails Immediately
- **Check**: Admin permissions
- **Check**: CSV format validity
- **Check**: Required fields presence

#### High Failure Rate
- **Check**: Email addresses exist in system
- **Check**: Course IDs are correct
- **Check**: Scores meet minimum thresholds

#### Slow Processing
- **Check**: Batch size (reduce if too large)
- **Check**: System load
- **Check**: Database performance

#### Partial Success
- **Review**: Error messages for failed records
- **Fix**: Data issues and re-run for failed records
- **Use**: Skip existing option for re-runs

### Getting Help

1. **Check Error Messages**: Most issues are clearly indicated
2. **Review Documentation**: Ensure correct format and usage
3. **Test with Small Batch**: Isolate issues with minimal data
4. **Contact Support**: Provide error messages and sample data

## API Integration Examples

### JavaScript/Frontend Integration

```javascript
// Text-based import
const importResult = await API.admin.bulkImportTutors(csvData, {
  dryRun: false,
  skipExisting: true,
  autoQualify: true,
  notificationEmail: 'admin@example.com'
});

// File-based import
const fileResult = await API.admin.bulkImportTutorsFromFile(csvFile, {
  dryRun: true,
  skipExisting: false,
  autoQualify: true
});

// Check job status
const jobStatus = await API.admin.getBulkImportJob(jobId);
```

### cURL Examples

```bash
# Validate CSV data
curl -X POST "http://localhost:5000/api/admin/tutors/validate-csv" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"csv_data": "email,course_id,score,qualification_date\ntest@example.com,course-1,92,2024-01-15"}'

# Process bulk import
curl -X POST "http://localhost:5000/api/admin/tutors/bulk-import" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "csv_data": "email,course_id,score,qualification_date\ntest@example.com,course-1,92,2024-01-15",
    "dry_run": false,
    "skip_existing": true
  }'

# Upload CSV file
curl -X POST "http://localhost:5000/api/admin/tutors/bulk-import-file" \
  -H "Authorization: Bearer $TOKEN" \
  -F "csv_file=@students.csv" \
  -F "dry_run=false" \
  -F "skip_existing=true"
```

## Maintenance and Monitoring

### Regular Maintenance Tasks

1. **Database Cleanup**
   - Archive old import jobs (>90 days)
   - Clean up orphaned records
   - Optimize query performance

2. **Performance Monitoring**
   - Track import processing times
   - Monitor error rates
   - Review system resource usage

3. **Data Quality Checks**
   - Validate qualification integrity
   - Check for duplicate qualifications
   - Verify course setting consistency

### Monitoring Metrics

- **Import Success Rate**: Target >95%
- **Processing Time**: <1 minute per 100 records
- **Error Rate**: <5% validation errors
- **System Uptime**: >99.9%

### Backup and Recovery

1. **Data Backup**
   - Daily backups of qualification tables
   - Import job history preservation
   - Configuration settings backup

2. **Recovery Procedures**
   - Rollback failed imports
   - Restore previous qualification states
   - Rebuild qualification history

## Version History

### v1.0.0 - Initial Release
- Basic CSV import functionality
- Text input and file upload support
- Core validation and error handling

### v1.1.0 - Enhanced Features
- Dry run mode implementation
- Progress tracking and status updates
- Import history and job management

### v1.2.0 - Advanced Options
- Skip existing qualifications option
- Notification email support
- Enhanced error reporting

### v1.3.0 - Performance Improvements
- Batch processing optimization
- Database query improvements
- Memory usage optimization

---

For technical support or feature requests, please contact the development team or create an issue in the project repository.