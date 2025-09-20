-- Database initialization script for ORMS
-- This script sets up the initial database structure

-- Create database and user if they don't exist
CREATE DATABASE orms_db;
CREATE USER orms_user WITH ENCRYPTED PASSWORD 'orms_password';
GRANT ALL PRIVILEGES ON DATABASE orms_db TO orms_user;

-- Connect to the orms_db database
\c orms_db;

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO orms_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO orms_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO orms_user;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set up initial configuration
ALTER DATABASE orms_db SET timezone TO 'UTC';