-- Backup script for database excluding availability records
-- Generated: 2025-09-16 20:58:36

.output backups/availability_cleanup_20250916_205836/schema_backup.sql

-- Export schema for all tables including availability (structure only)
.schema

.output backups/availability_cleanup_20250916_205836/data_backup.sql

-- Export data for all tables except availability
.dump alembic_version
.dump users
.dump courses
.dump invoices
.dump payments
.dump pricing_plans
.dump course_tutors
.dump modules
.dump enrollments
.dump notifications
.dump stripe_customers
.dump credit_balances
.dump guardian_invitations
.dump ai_prompts
.dump system_config
.dump admin_actions
.dump password_reset_tokens
.dump admin_secure_sessions
.dump password_view_audit
.dump user_password_vault
.dump admin_security_config
.dump student_credit_allocations
.dump course_chats
.dump system_settings
.dump user_course_progress
.dump tutor_qualifications
.dump course_settings
.dump bulk_import_jobs
.dump guardian_student_requests
.dump guardian_student_links
.dump lessons
.dump payment_methods
.dump chat_participants
.dump chat_messages
.dump quizzes
.dump sessions
.dump message_read_status
.dump session_students
.dump questions
.dump quiz_results
.dump tutor_earnings
.dump student_session_feedback
.dump credit_transactions

.output stdout