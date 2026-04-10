-- 2026-04-09
-- Add explicit role flags for compatibility with middleware and admin/manager guards.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_admin ENUM('0','1') NOT NULL DEFAULT '0' AFTER level,
    ADD COLUMN IF NOT EXISTS is_manager ENUM('0','1') NOT NULL DEFAULT '0' AFTER is_admin;

-- Backfill role flags from legacy numeric level.
UPDATE users
SET is_admin = '1'
WHERE level = 1;

UPDATE users
SET is_manager = '1'
WHERE level = 2;

-- Keep role lookups fast.
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);
CREATE INDEX IF NOT EXISTS idx_users_is_manager ON users(is_manager);