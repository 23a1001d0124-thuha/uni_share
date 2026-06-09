-- ==========================================
-- UNI-SHARE STUDENT AUTHENTICATION AND VERIFICATION
-- ==========================================

-- Enable pgcrypto for gen_random_uuid() if not enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,         -- bcrypt hash of user's password
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  university_name TEXT,
  university_short_name TEXT,
  university_city TEXT,
  student_email TEXT UNIQUE,      -- verified student email
  is_student_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  rating DECIMAL(3,1) DEFAULT 5.0,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Email Verifications Table
CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  student_email TEXT NOT NULL,
  otp_code TEXT NOT NULL,         -- 6 digits plain (for initial matching speed or hash verification)
  otp_hash TEXT NOT NULL,         -- bcrypt hash of OTP
  university_domain TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL, -- 15 minutes validity
  is_used BOOLEAN DEFAULT FALSE,
  attempts INTEGER DEFAULT 0,     -- Attempt counter for wrong OTP entries
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_users_student_email ON users(student_email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(student_email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_user_id ON email_verifications(user_id);
