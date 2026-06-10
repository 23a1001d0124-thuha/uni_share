-- Migration: Thêm trường xác thực thẻ SV Uy Tín (Tầng 2)
-- Chạy trong Supabase SQL Editor

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_trusted_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS trusted_verified_at TIMESTAMPTZ;

-- Index để query nhanh
CREATE INDEX IF NOT EXISTS idx_users_trusted_verified ON users(is_trusted_verified);
