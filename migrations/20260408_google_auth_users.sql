-- Google auth extension migration for users table
-- Date: 2026-04-08

ALTER TABLE users
    ADD COLUMN google_id VARCHAR(255) NULL UNIQUE AFTER phone,
    ADD COLUMN email VARCHAR(255) NULL UNIQUE AFTER google_id,
    ADD COLUMN auth_provider VARCHAR(30) NOT NULL DEFAULT 'phone' AFTER email,
    ADD COLUMN email_verified ENUM('0','1') NOT NULL DEFAULT '0' AFTER auth_provider,
    ADD COLUMN phone_verified ENUM('0','1') NOT NULL DEFAULT '0' AFTER email_verified,
    ADD COLUMN is_profile_completed ENUM('0','1') NOT NULL DEFAULT '0' AFTER phone_verified;

-- Allow social accounts without phone; legacy phone-based users remain unchanged.
ALTER TABLE users
    MODIFY COLUMN phone VARCHAR(20) NULL DEFAULT NULL;

-- Backfill verification flags for existing accounts.
UPDATE users
SET
    phone_verified = CASE WHEN veri = 1 AND phone IS NOT NULL AND phone <> '' AND phone <> '0' THEN '1' ELSE phone_verified END,
    is_profile_completed = CASE WHEN veri = 1 AND phone IS NOT NULL AND phone <> '' AND phone <> '0' THEN '1' ELSE is_profile_completed END,
    auth_provider = CASE WHEN auth_provider IS NULL OR auth_provider = '' THEN 'phone' ELSE auth_provider END;
