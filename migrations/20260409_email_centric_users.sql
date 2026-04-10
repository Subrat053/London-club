-- 2026-04-09
-- Email-centric user identity migration (Google-first auth, backward-compatible rollout)

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS email VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(30) NOT NULL DEFAULT 'google',
    ADD COLUMN IF NOT EXISTS email_verified ENUM('0','1') NOT NULL DEFAULT '0',
    ADD COLUMN IF NOT EXISTS full_name VARCHAR(150) NULL,
    ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS last_login BIGINT NULL;

-- Keep phone only as optional profile/contact metadata.
ALTER TABLE users
    MODIFY COLUMN phone VARCHAR(20) NULL DEFAULT NULL;

-- Preserve backward compatibility for legacy phone users.
UPDATE users
SET auth_provider = 'phone'
WHERE (google_id IS NULL OR google_id = '')
  AND (email IS NULL OR email = '')
  AND phone IS NOT NULL
  AND phone <> ''
  AND phone <> '0';

-- Mark Google identities explicitly.
UPDATE users
SET
    auth_provider = 'google',
    email_verified = CASE WHEN email_verified = '1' THEN '1' ELSE '1' END,
    veri = '1',
    status = '1'
WHERE (google_id IS NOT NULL AND google_id <> '')
   OR (email IS NOT NULL AND email <> '' AND auth_provider = 'google');

-- Ensure indexes and unique constraints for identity lookup.
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_google_id ON users(google_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);
