CREATE TABLE alembic_version (
	version_num VARCHAR(32) NOT NULL, 
	CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);
CREATE TABLE users (
	id VARCHAR(50) NOT NULL, 
	email VARCHAR(120) NOT NULL, 
	password_hash VARCHAR(128) NOT NULL, 
	account_type VARCHAR(20) NOT NULL, 
	roles JSON, 
	is_active BOOLEAN, 
	status VARCHAR(30), 
	last_login DATETIME, 
	created_at DATETIME, 
	updated_at DATETIME, 
	profile JSON, 
	temp_password_hash VARCHAR(255), 
	temp_password_expires_at DATETIME, 
	force_password_change BOOLEAN, 
	temp_password_created_by VARCHAR(50), 
	reset_token VARCHAR(64), 
	reset_token_expires DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(temp_password_created_by) REFERENCES users (id)
);
CREATE UNIQUE INDEX ix_users_email ON users (email);
CREATE TABLE courses (
	id VARCHAR(50) NOT NULL, 
	title VARCHAR(200) NOT NULL, 
	description TEXT, 
	price FLOAT, 
	currency VARCHAR(3), 
	duration VARCHAR(50), 
	level VARCHAR(50), 
	subject VARCHAR(100), 
	country VARCHAR(100), 
	grade_level VARCHAR(50), 
	status VARCHAR(20), 
	timezone VARCHAR(50), 
	thumbnail VARCHAR(500), 
	syllabus JSON, 
	prerequisites JSON, 
	learning_outcomes JSON, 
	created_at DATETIME, 
	updated_at DATETIME, 
	PRIMARY KEY (id)
);
CREATE TABLE invoices (
	id VARCHAR(50) NOT NULL, 
	invoice_number VARCHAR(50) NOT NULL, 
	guardian_id VARCHAR(50) NOT NULL, 
	student_id VARCHAR(50), 
	course_id VARCHAR(50), 
	payment_id VARCHAR(50), 
	amount FLOAT NOT NULL, 
	subtotal FLOAT NOT NULL, 
	tax_amount FLOAT, 
	tax_rate FLOAT, 
	currency VARCHAR(3), 
	status VARCHAR(20), 
	payment_method VARCHAR(50), 
	payment_date DATETIME, 
	due_date DATETIME, 
	items JSON, 
	line_items JSON, 
	pdf_path VARCHAR(255), 
	notes TEXT, 
	created_at DATETIME, 
	updated_at DATETIME, 
	PRIMARY KEY (id), 
	UNIQUE (invoice_number), 
	FOREIGN KEY(guardian_id) REFERENCES users (id), 
	FOREIGN KEY(student_id) REFERENCES users (id), 
	FOREIGN KEY(course_id) REFERENCES courses (id), 
	FOREIGN KEY(payment_id) REFERENCES payments (id)
);
CREATE TABLE payments (
	id VARCHAR(50) NOT NULL, 
	invoice_id VARCHAR(50), 
	guardian_id VARCHAR(50), 
	amount FLOAT NOT NULL, 
	currency VARCHAR(3), 
	method VARCHAR(50) NOT NULL, 
	status VARCHAR(20), 
	transaction_id VARCHAR(100), 
	gateway_response JSON, 
	credits_earned FLOAT, 
	processed_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(invoice_id) REFERENCES invoices (id), 
	FOREIGN KEY(guardian_id) REFERENCES users (id)
);
CREATE TABLE pricing_plans (
	id VARCHAR(50) NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	price FLOAT NOT NULL, 
	currency VARCHAR(3), 
	period VARCHAR(50) NOT NULL, 
	credit_rate FLOAT NOT NULL, 
	features JSON, 
	is_popular BOOLEAN, 
	is_active BOOLEAN, 
	display_order INTEGER, 
	created_at DATETIME, 
	updated_at DATETIME, 
	PRIMARY KEY (id)
);
CREATE TABLE course_tutors (
	course_id VARCHAR(50) NOT NULL, 
	tutor_id VARCHAR(50) NOT NULL, 
	PRIMARY KEY (course_id, tutor_id), 
	FOREIGN KEY(course_id) REFERENCES courses (id), 
	FOREIGN KEY(tutor_id) REFERENCES users (id)
);
CREATE TABLE modules (
	id VARCHAR(50) NOT NULL, 
	course_id VARCHAR(50) NOT NULL, 
	title VARCHAR(200) NOT NULL, 
	description TEXT, 
	"order" INTEGER, 
	duration VARCHAR(50), 
	status VARCHAR(20), 
	start_date DATETIME, 
	end_date DATETIME, 
	created_at DATETIME, 
	updated_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(course_id) REFERENCES courses (id)
);
CREATE TABLE enrollments (
	id VARCHAR(50) NOT NULL, 
	student_id VARCHAR(50) NOT NULL, 
	course_id VARCHAR(50) NOT NULL, 
	guardian_id VARCHAR(50), 
	status VARCHAR(20), 
	enrolled_date DATETIME, 
	enrolled_timezone VARCHAR(50), 
	approved_date DATETIME, 
	approved_timezone VARCHAR(50), 
	progress INTEGER, 
	credits_used INTEGER, 
	completed_modules JSON, 
	current_module VARCHAR(50), 
	PRIMARY KEY (id), 
	FOREIGN KEY(student_id) REFERENCES users (id), 
	FOREIGN KEY(course_id) REFERENCES courses (id), 
	FOREIGN KEY(guardian_id) REFERENCES users (id)
);
CREATE TABLE notifications (
	id VARCHAR(50) NOT NULL, 
	user_id VARCHAR(50) NOT NULL, 
	type VARCHAR(50) NOT NULL, 
	title VARCHAR(200), 
	message TEXT NOT NULL, 
	data JSON, 
	read BOOLEAN, 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id)
);
CREATE TABLE stripe_customers (
	id VARCHAR(50) NOT NULL, 
	user_id VARCHAR(50) NOT NULL, 
	stripe_customer_id VARCHAR(100) NOT NULL, 
	email VARCHAR(255), 
	created_at DATETIME, 
	updated_at DATETIME, 
	PRIMARY KEY (id), 
	UNIQUE (user_id), 
	FOREIGN KEY(user_id) REFERENCES users (id), 
	UNIQUE (stripe_customer_id)
);
CREATE TABLE credit_balances (
	id VARCHAR(50) NOT NULL, 
	guardian_id VARCHAR(50) NOT NULL, 
	total_credits FLOAT, 
	used_credits FLOAT, 
	available_credits FLOAT, 
	last_updated DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(guardian_id) REFERENCES users (id)
);
CREATE TABLE availability (
	id VARCHAR(50) NOT NULL, 
	tutor_id VARCHAR(50) NOT NULL, 
	day_of_week INTEGER NOT NULL, 
	start_time VARCHAR(5) NOT NULL, 
	end_time VARCHAR(5) NOT NULL, 
	available BOOLEAN, 
	time_zone VARCHAR(50), 
	created_timezone VARCHAR(50), 
	browser_timezone VARCHAR(50), 
	course_id VARCHAR(50), 
	is_recurring BOOLEAN, 
	recurrence_type VARCHAR(20), 
	recurrence_days JSON, 
	recurrence_end_date DATETIME, 
	parent_availability_id VARCHAR(50), 
	exception_dates JSON, 
	specific_date DATE, 
	created_at DATETIME, 
	updated_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(tutor_id) REFERENCES users (id), 
	FOREIGN KEY(course_id) REFERENCES courses (id), 
	FOREIGN KEY(parent_availability_id) REFERENCES availability (id)
);
CREATE TABLE guardian_invitations (
	id VARCHAR(50) NOT NULL, 
	student_id VARCHAR(50) NOT NULL, 
	guardian_email VARCHAR(120) NOT NULL, 
	invitation_token VARCHAR(100) NOT NULL, 
	status VARCHAR(20), 
	invited_at DATETIME, 
	expires_at DATETIME NOT NULL, 
	accepted_at DATETIME, 
	guardian_id VARCHAR(50), 
	PRIMARY KEY (id), 
	FOREIGN KEY(student_id) REFERENCES users (id), 
	FOREIGN KEY(guardian_id) REFERENCES users (id)
);
CREATE UNIQUE INDEX ix_guardian_invitations_invitation_token ON guardian_invitations (invitation_token);
CREATE INDEX ix_guardian_invitations_guardian_email ON guardian_invitations (guardian_email);
CREATE TABLE ai_prompts (
	id VARCHAR(50) NOT NULL, 
	prompt_name VARCHAR(100) NOT NULL, 
	prompt_content TEXT NOT NULL, 
	created_by VARCHAR(50), 
	updated_by VARCHAR(50), 
	created_at DATETIME, 
	updated_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(created_by) REFERENCES users (id), 
	FOREIGN KEY(updated_by) REFERENCES users (id)
);
CREATE UNIQUE INDEX ix_ai_prompts_prompt_name ON ai_prompts (prompt_name);
CREATE TABLE system_config (
	id VARCHAR(50) NOT NULL, 
	config_key VARCHAR(100) NOT NULL, 
	config_value TEXT NOT NULL, 
	updated_by VARCHAR(50), 
	updated_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(updated_by) REFERENCES users (id)
);
CREATE UNIQUE INDEX ix_system_config_config_key ON system_config (config_key);
CREATE TABLE admin_actions (
	id VARCHAR(50) NOT NULL, 
	admin_id VARCHAR(50) NOT NULL, 
	action_type VARCHAR(50) NOT NULL, 
	target_user_id VARCHAR(50) NOT NULL, 
	details JSON, 
	ip_address VARCHAR(45), 
	user_agent TEXT, 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(admin_id) REFERENCES users (id), 
	FOREIGN KEY(target_user_id) REFERENCES users (id)
);
CREATE TABLE password_reset_tokens (
	id VARCHAR(50) NOT NULL, 
	user_id VARCHAR(50) NOT NULL, 
	token_hash VARCHAR(255) NOT NULL, 
	initiated_by_admin VARCHAR(50) NOT NULL, 
	expires_at DATETIME NOT NULL, 
	used_at DATETIME, 
	ip_address VARCHAR(45), 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id), 
	FOREIGN KEY(initiated_by_admin) REFERENCES users (id)
);
CREATE TABLE admin_secure_sessions (
	id VARCHAR(50) NOT NULL, 
	admin_id VARCHAR(50) NOT NULL, 
	session_token VARCHAR(255) NOT NULL, 
	operations_allowed JSON, 
	created_at DATETIME, 
	expires_at DATETIME NOT NULL, 
	last_activity_at DATETIME, 
	ip_address VARCHAR(45), 
	user_agent TEXT, 
	mfa_verified BOOLEAN, 
	is_revoked BOOLEAN, 
	PRIMARY KEY (id), 
	FOREIGN KEY(admin_id) REFERENCES users (id), 
	UNIQUE (session_token)
);
CREATE TABLE password_view_audit (
	id VARCHAR(50) NOT NULL, 
	admin_id VARCHAR(50) NOT NULL, 
	target_user_id VARCHAR(50) NOT NULL, 
	view_type VARCHAR(20) NOT NULL, 
	ip_address VARCHAR(45), 
	user_agent TEXT, 
	session_token VARCHAR(255), 
	justification TEXT, 
	viewed_at DATETIME, 
	mfa_verified BOOLEAN, 
	admin_re_authenticated BOOLEAN, 
	browser_fingerprint VARCHAR(255), 
	PRIMARY KEY (id), 
	FOREIGN KEY(admin_id) REFERENCES users (id), 
	FOREIGN KEY(target_user_id) REFERENCES users (id)
);
CREATE TABLE user_password_vault (
	id VARCHAR(50) NOT NULL, 
	user_id VARCHAR(50) NOT NULL, 
	password_plaintext_encrypted TEXT, 
	password_hash VARCHAR(255) NOT NULL, 
	encryption_key_id VARCHAR(50) NOT NULL, 
	created_at DATETIME, 
	is_current BOOLEAN, 
	store_plaintext BOOLEAN, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id)
);
CREATE TABLE admin_security_config (
	id VARCHAR(50) NOT NULL, 
	config_key VARCHAR(100) NOT NULL, 
	config_value JSON NOT NULL, 
	created_by VARCHAR(50), 
	updated_by VARCHAR(50), 
	created_at DATETIME, 
	updated_at DATETIME, 
	PRIMARY KEY (id), 
	UNIQUE (config_key), 
	FOREIGN KEY(created_by) REFERENCES users (id), 
	FOREIGN KEY(updated_by) REFERENCES users (id)
);
CREATE TABLE student_credit_allocations (
	id VARCHAR(50) NOT NULL, 
	guardian_id VARCHAR(50) NOT NULL, 
	student_id VARCHAR(50) NOT NULL, 
	allocated_credits FLOAT, 
	used_credits FLOAT, 
	remaining_credits FLOAT, 
	allocation_reason VARCHAR(200), 
	last_updated DATETIME, 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(guardian_id) REFERENCES users (id), 
	FOREIGN KEY(student_id) REFERENCES users (id)
);
CREATE TABLE course_chats (
	id VARCHAR(50) NOT NULL, 
	course_id VARCHAR(50) NOT NULL, 
	name VARCHAR(200) NOT NULL, 
	created_by VARCHAR(50) NOT NULL, 
	created_at DATETIME, 
	updated_at DATETIME, 
	last_message_at DATETIME, 
	is_active BOOLEAN, 
	participants_count INTEGER, 
	PRIMARY KEY (id), 
	FOREIGN KEY(course_id) REFERENCES courses (id), 
	FOREIGN KEY(created_by) REFERENCES users (id)
);
CREATE TABLE system_settings (
	id VARCHAR(50) NOT NULL, 
	setting_key VARCHAR(100) NOT NULL, 
	setting_value TEXT NOT NULL, 
	setting_type VARCHAR(20), 
	description TEXT, 
	created_at DATETIME, 
	updated_at DATETIME, 
	updated_by VARCHAR(50), 
	PRIMARY KEY (id), 
	UNIQUE (setting_key), 
	FOREIGN KEY(updated_by) REFERENCES users (id)
);
CREATE TABLE user_course_progress (
	id VARCHAR(50) NOT NULL, 
	user_id VARCHAR(50) NOT NULL, 
	course_id VARCHAR(50) NOT NULL, 
	status VARCHAR(20), 
	completion_percentage FLOAT, 
	final_score FLOAT, 
	completion_date DATETIME, 
	enrolled_at DATETIME, 
	started_at DATETIME, 
	updated_at DATETIME, 
	PRIMARY KEY (id), 
	CONSTRAINT unique_user_course_progress UNIQUE (user_id, course_id), 
	FOREIGN KEY(user_id) REFERENCES users (id), 
	FOREIGN KEY(course_id) REFERENCES courses (id)
);
CREATE TABLE tutor_qualifications (
	id VARCHAR(50) NOT NULL, 
	user_id VARCHAR(50) NOT NULL, 
	course_id VARCHAR(50) NOT NULL, 
	qualification_type VARCHAR(20), 
	qualifying_score FLOAT, 
	is_active BOOLEAN, 
	approved_by VARCHAR(50), 
	revoked_by VARCHAR(50), 
	revoked_at DATETIME, 
	revoke_reason TEXT, 
	qualified_at DATETIME, 
	created_at DATETIME, 
	updated_at DATETIME, 
	PRIMARY KEY (id), 
	CONSTRAINT unique_user_course_qualification UNIQUE (user_id, course_id), 
	FOREIGN KEY(user_id) REFERENCES users (id), 
	FOREIGN KEY(course_id) REFERENCES courses (id), 
	FOREIGN KEY(approved_by) REFERENCES users (id), 
	FOREIGN KEY(revoked_by) REFERENCES users (id)
);
CREATE TABLE course_settings (
	id VARCHAR(50) NOT NULL, 
	course_id VARCHAR(50) NOT NULL, 
	min_score_to_tutor FLOAT, 
	auto_qualify BOOLEAN NOT NULL, 
	auto_approve_tutors BOOLEAN, 
	manual_approval_required BOOLEAN, 
	allow_student_tutors BOOLEAN, 
	max_attempts_before_tutor_eligible INTEGER, 
	created_by VARCHAR(50), 
	updated_by VARCHAR(50), 
	created_at DATETIME, 
	updated_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(course_id) REFERENCES courses (id), 
	FOREIGN KEY(created_by) REFERENCES users (id), 
	FOREIGN KEY(updated_by) REFERENCES users (id)
);
CREATE TABLE bulk_import_jobs (
	id VARCHAR(50) NOT NULL, 
	job_status VARCHAR(20), 
	file_name VARCHAR(255), 
	import_type VARCHAR(20), 
	total_records INTEGER, 
	successful_records INTEGER, 
	failed_records INTEGER, 
	skipped_records INTEGER, 
	errors JSON, 
	results JSON, 
	options JSON, 
	imported_by VARCHAR(50) NOT NULL, 
	created_at DATETIME, 
	started_at DATETIME, 
	completed_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(imported_by) REFERENCES users (id)
);
CREATE TABLE guardian_student_requests (
	id VARCHAR(50) NOT NULL, 
	student_id VARCHAR(50) NOT NULL, 
	guardian_id VARCHAR(50) NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	request_date DATETIME NOT NULL, 
	request_timezone VARCHAR(50), 
	processed_date DATETIME, 
	processed_timezone VARCHAR(50), 
	processed_by VARCHAR(50), 
	student_message TEXT, 
	guardian_response TEXT, 
	rejection_reason TEXT, 
	notes TEXT, 
	created_at DATETIME, 
	updated_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(student_id) REFERENCES users (id), 
	FOREIGN KEY(guardian_id) REFERENCES users (id), 
	FOREIGN KEY(processed_by) REFERENCES users (id)
);
CREATE INDEX ix_guardian_student_requests_student_id ON guardian_student_requests (student_id);
CREATE INDEX ix_guardian_student_requests_status ON guardian_student_requests (status);
CREATE INDEX ix_guardian_student_requests_request_date ON guardian_student_requests (request_date);
CREATE INDEX ix_guardian_student_requests_guardian_id ON guardian_student_requests (guardian_id);
CREATE TABLE guardian_student_links (
	id VARCHAR(50) NOT NULL, 
	student_id VARCHAR(50) NOT NULL, 
	guardian_id VARCHAR(50) NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	linked_date DATETIME, 
	linked_timezone VARCHAR(50), 
	linked_by VARCHAR(50), 
	unlinked_date DATETIME, 
	unlinked_by VARCHAR(50), 
	unlink_reason TEXT, 
	created_at DATETIME, 
	updated_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(student_id) REFERENCES users (id), 
	FOREIGN KEY(guardian_id) REFERENCES users (id), 
	FOREIGN KEY(linked_by) REFERENCES users (id), 
	FOREIGN KEY(unlinked_by) REFERENCES users (id)
);
CREATE INDEX ix_guardian_student_links_guardian_id ON guardian_student_links (guardian_id);
CREATE INDEX ix_guardian_student_links_student_id ON guardian_student_links (student_id);
CREATE INDEX ix_guardian_student_links_status ON guardian_student_links (status);
CREATE TABLE lessons (
	id VARCHAR(50) NOT NULL, 
	module_id VARCHAR(50) NOT NULL, 
	title VARCHAR(200) NOT NULL, 
	description TEXT, 
	"order" INTEGER, 
	duration INTEGER, 
	type VARCHAR(50), 
	content JSON, 
	status VARCHAR(20), 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(module_id) REFERENCES modules (id)
);
CREATE TABLE payment_methods (
	id VARCHAR(50) NOT NULL, 
	user_id VARCHAR(50) NOT NULL, 
	stripe_customer_id VARCHAR(50), 
	stripe_payment_method_id VARCHAR(100), 
	type VARCHAR(20) NOT NULL, 
	nickname VARCHAR(100), 
	is_default BOOLEAN, 
	card_type VARCHAR(20), 
	last4 VARCHAR(4), 
	exp_month INTEGER, 
	exp_year INTEGER, 
	bank_name VARCHAR(100), 
	account_type VARCHAR(20), 
	paypal_email VARCHAR(255), 
	paypal_account_id VARCHAR(100), 
	is_active BOOLEAN, 
	verified BOOLEAN, 
	created_at DATETIME, 
	updated_at DATETIME, 
	last_used_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id), 
	FOREIGN KEY(stripe_customer_id) REFERENCES stripe_customers (id)
);
CREATE TABLE chat_participants (
	id VARCHAR(50) NOT NULL, 
	chat_id VARCHAR(50) NOT NULL, 
	user_id VARCHAR(50) NOT NULL, 
	role VARCHAR(20) NOT NULL, 
	joined_at DATETIME, 
	last_read_at DATETIME, 
	is_active BOOLEAN, 
	can_send_messages BOOLEAN, 
	PRIMARY KEY (id), 
	CONSTRAINT unique_chat_participant UNIQUE (chat_id, user_id), 
	FOREIGN KEY(chat_id) REFERENCES course_chats (id), 
	FOREIGN KEY(user_id) REFERENCES users (id)
);
CREATE TABLE chat_messages (
	id VARCHAR(50) NOT NULL, 
	chat_id VARCHAR(50) NOT NULL, 
	sender_id VARCHAR(50) NOT NULL, 
	message_text TEXT NOT NULL, 
	message_type VARCHAR(20), 
	created_at DATETIME, 
	edited_at DATETIME, 
	is_deleted BOOLEAN, 
	reply_to_message_id VARCHAR(50), 
	file_name VARCHAR(255), 
	file_path VARCHAR(500), 
	file_size INTEGER, 
	file_type VARCHAR(100), 
	PRIMARY KEY (id), 
	FOREIGN KEY(chat_id) REFERENCES course_chats (id), 
	FOREIGN KEY(sender_id) REFERENCES users (id), 
	FOREIGN KEY(reply_to_message_id) REFERENCES chat_messages (id)
);
CREATE TABLE quizzes (
	id VARCHAR(50) NOT NULL, 
	module_id VARCHAR(50), 
	lesson_id VARCHAR(50), 
	title VARCHAR(200) NOT NULL, 
	description TEXT, 
	time_limit INTEGER, 
	passing_score INTEGER, 
	topics JSON, 
	status VARCHAR(20), 
	valid_from DATETIME, 
	valid_until DATETIME, 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(module_id) REFERENCES modules (id), 
	FOREIGN KEY(lesson_id) REFERENCES lessons (id)
);
CREATE TABLE sessions (
	id VARCHAR(50) NOT NULL, 
	course_id VARCHAR(50), 
	module_id VARCHAR(50), 
	lesson_id VARCHAR(50), 
	tutor_id VARCHAR(50) NOT NULL, 
	availability_id VARCHAR(50), 
	title VARCHAR(200) NOT NULL, 
	description TEXT, 
	scheduled_date DATETIME NOT NULL, 
	timezone VARCHAR(50), 
	created_timezone VARCHAR(50), 
	browser_timezone VARCHAR(50), 
	duration INTEGER, 
	status VARCHAR(20), 
	meeting_link VARCHAR(500), 
	meeting_id VARCHAR(100), 
	meeting_password VARCHAR(50), 
	meeting_start_url VARCHAR(500), 
	meeting_uuid VARCHAR(100), 
	topic VARCHAR(200), 
	max_students INTEGER, 
	price FLOAT, 
	currency VARCHAR(3), 
	created_at DATETIME, 
	transcript_text TEXT, 
	ai_tutor_feedback TEXT, 
	session_rating FLOAT, 
	participants_summary TEXT, 
	transcript_language VARCHAR(10), 
	feedback_generated_at DATETIME, 
	zoom_meeting_duration INTEGER, 
	zoom_participants_count INTEGER, 
	PRIMARY KEY (id), 
	FOREIGN KEY(course_id) REFERENCES courses (id), 
	FOREIGN KEY(module_id) REFERENCES modules (id), 
	FOREIGN KEY(lesson_id) REFERENCES lessons (id), 
	FOREIGN KEY(tutor_id) REFERENCES users (id), 
	FOREIGN KEY(availability_id) REFERENCES availability (id)
);
CREATE TABLE message_read_status (
	id VARCHAR(50) NOT NULL, 
	message_id VARCHAR(50) NOT NULL, 
	user_id VARCHAR(50) NOT NULL, 
	read_at DATETIME, 
	PRIMARY KEY (id), 
	CONSTRAINT unique_message_read UNIQUE (message_id, user_id), 
	FOREIGN KEY(message_id) REFERENCES chat_messages (id), 
	FOREIGN KEY(user_id) REFERENCES users (id)
);
CREATE TABLE session_students (
	session_id VARCHAR(50) NOT NULL, 
	student_id VARCHAR(50) NOT NULL, 
	PRIMARY KEY (session_id, student_id), 
	FOREIGN KEY(session_id) REFERENCES sessions (id), 
	FOREIGN KEY(student_id) REFERENCES users (id)
);
CREATE TABLE questions (
	id VARCHAR(50) NOT NULL, 
	quiz_id VARCHAR(50) NOT NULL, 
	question TEXT NOT NULL, 
	type VARCHAR(50) NOT NULL, 
	options JSON, 
	correct_answer TEXT, 
	explanation TEXT, 
	points INTEGER, 
	"order" INTEGER, 
	PRIMARY KEY (id), 
	FOREIGN KEY(quiz_id) REFERENCES quizzes (id)
);
CREATE TABLE quiz_results (
	id VARCHAR(50) NOT NULL, 
	quiz_id VARCHAR(50) NOT NULL, 
	student_id VARCHAR(50) NOT NULL, 
	course_id VARCHAR(50), 
	module_id VARCHAR(50), 
	score INTEGER NOT NULL, 
	total_questions INTEGER NOT NULL, 
	correct_answers INTEGER NOT NULL, 
	time_spent INTEGER, 
	answers JSON, 
	completed_at DATETIME, 
	completed_timezone VARCHAR(50), 
	status VARCHAR(20), 
	PRIMARY KEY (id), 
	FOREIGN KEY(quiz_id) REFERENCES quizzes (id), 
	FOREIGN KEY(student_id) REFERENCES users (id), 
	FOREIGN KEY(course_id) REFERENCES courses (id), 
	FOREIGN KEY(module_id) REFERENCES modules (id)
);
CREATE TABLE tutor_earnings (
	id VARCHAR(50) NOT NULL, 
	tutor_id VARCHAR(50) NOT NULL, 
	session_id VARCHAR(50), 
	amount FLOAT NOT NULL, 
	currency VARCHAR(3), 
	status VARCHAR(20), 
	earned_date DATETIME, 
	payout_date DATETIME, 
	commission FLOAT, 
	PRIMARY KEY (id), 
	FOREIGN KEY(tutor_id) REFERENCES users (id), 
	FOREIGN KEY(session_id) REFERENCES sessions (id)
);
CREATE TABLE student_session_feedback (
	id VARCHAR(50) NOT NULL, 
	session_id VARCHAR(50) NOT NULL, 
	student_id VARCHAR(50) NOT NULL, 
	guardian_id VARCHAR(50) NOT NULL, 
	ai_guardian_feedback TEXT NOT NULL, 
	student_performance_summary TEXT, 
	areas_of_improvement TEXT, 
	strengths_highlighted TEXT, 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(session_id) REFERENCES sessions (id), 
	FOREIGN KEY(student_id) REFERENCES users (id), 
	FOREIGN KEY(guardian_id) REFERENCES users (id)
);
CREATE INDEX idx_session_feedback ON student_session_feedback (session_id);
CREATE INDEX idx_student_feedback ON student_session_feedback (student_id, created_at);
CREATE INDEX idx_guardian_feedback ON student_session_feedback (guardian_id, created_at);
CREATE TABLE credit_transactions (
	id VARCHAR(50) NOT NULL, 
	guardian_id VARCHAR(50) NOT NULL, 
	student_id VARCHAR(50), 
	allocation_id VARCHAR(50), 
	transaction_type VARCHAR(50) NOT NULL, 
	credits FLOAT NOT NULL, 
	description VARCHAR(500), 
	related_session_id VARCHAR(50), 
	related_enrollment_id VARCHAR(50), 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(guardian_id) REFERENCES users (id), 
	FOREIGN KEY(student_id) REFERENCES users (id), 
	FOREIGN KEY(allocation_id) REFERENCES student_credit_allocations (id), 
	FOREIGN KEY(related_session_id) REFERENCES sessions (id), 
	FOREIGN KEY(related_enrollment_id) REFERENCES enrollments (id)
);
