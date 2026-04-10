-- user_id ownership migration with phone compatibility fallback
-- Date: 2026-04-08

-- 1) Ensure users table has email-centric fields used by Google auth.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS full_name VARCHAR(150) NULL AFTER name_user,
    ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(600) NULL AFTER full_name,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- 2) Add user_id on ownership tables where business logic currently relies on phone.
ALTER TABLE recharge ADD COLUMN IF NOT EXISTS user_id BIGINT NULL AFTER transaction_id;
ALTER TABLE withdraw ADD COLUMN IF NOT EXISTS user_id BIGINT NULL AFTER id_order;
ALTER TABLE minutes_1 ADD COLUMN IF NOT EXISTS user_id BIGINT NULL AFTER id_product;
ALTER TABLE result_5d ADD COLUMN IF NOT EXISTS user_id BIGINT NULL AFTER id_product;
ALTER TABLE result_k3 ADD COLUMN IF NOT EXISTS user_id BIGINT NULL AFTER id_product;
ALTER TABLE safe ADD COLUMN IF NOT EXISTS user_id BIGINT NULL AFTER id;
ALTER TABLE balance_transfer
    ADD COLUMN IF NOT EXISTS sender_user_id BIGINT NULL AFTER id,
    ADD COLUMN IF NOT EXISTS receiver_user_id BIGINT NULL AFTER sender_user_id,
    ADD COLUMN IF NOT EXISTS sender_email VARCHAR(255) NULL AFTER receiver_phone,
    ADD COLUMN IF NOT EXISTS receiver_email VARCHAR(255) NULL AFTER sender_email;

-- 3) Backfill user_id using legacy phone links.
UPDATE recharge r
JOIN users u ON u.phone = r.phone
SET r.user_id = u.id
WHERE r.user_id IS NULL;

UPDATE withdraw w
JOIN users u ON u.phone = w.phone
SET w.user_id = u.id
WHERE w.user_id IS NULL;

UPDATE minutes_1 m
JOIN users u ON u.phone = m.phone
SET m.user_id = u.id
WHERE m.user_id IS NULL;

UPDATE result_5d r5
JOIN users u ON u.phone = r5.phone
SET r5.user_id = u.id
WHERE r5.user_id IS NULL;

UPDATE result_k3 rk
JOIN users u ON u.phone = rk.phone
SET rk.user_id = u.id
WHERE rk.user_id IS NULL;

UPDATE safe s
JOIN users u ON u.phone = s.phone
SET s.user_id = u.id
WHERE s.user_id IS NULL;

UPDATE balance_transfer bt
JOIN users us ON us.phone = bt.sender_phone
SET bt.sender_user_id = us.id
WHERE bt.sender_user_id IS NULL;

UPDATE balance_transfer bt
JOIN users ur ON ur.phone = bt.receiver_phone
SET bt.receiver_user_id = ur.id
WHERE bt.receiver_user_id IS NULL;

-- 4) Add indexes for user_id-first access and keep phone lookups fast during transition.
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_recharge_user_id ON recharge(user_id);
CREATE INDEX IF NOT EXISTS idx_withdraw_user_id ON withdraw(user_id);
CREATE INDEX IF NOT EXISTS idx_minutes_1_user_id ON minutes_1(user_id);
CREATE INDEX IF NOT EXISTS idx_result_5d_user_id ON result_5d(user_id);
CREATE INDEX IF NOT EXISTS idx_result_k3_user_id ON result_k3(user_id);
CREATE INDEX IF NOT EXISTS idx_safe_user_id ON safe(user_id);
CREATE INDEX IF NOT EXISTS idx_balance_transfer_sender_user_id ON balance_transfer(sender_user_id);
CREATE INDEX IF NOT EXISTS idx_balance_transfer_receiver_user_id ON balance_transfer(receiver_user_id);

-- 5) Add foreign keys where possible (kept nullable for phased rollout).
SET @fk_exists = (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'recharge'
      AND CONSTRAINT_NAME = 'fk_recharge_user_id'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE recharge ADD CONSTRAINT fk_recharge_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists = (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'withdraw'
      AND CONSTRAINT_NAME = 'fk_withdraw_user_id'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE withdraw ADD CONSTRAINT fk_withdraw_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists = (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'minutes_1'
      AND CONSTRAINT_NAME = 'fk_minutes_1_user_id'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE minutes_1 ADD CONSTRAINT fk_minutes_1_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists = (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'result_5d'
      AND CONSTRAINT_NAME = 'fk_result_5d_user_id'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE result_5d ADD CONSTRAINT fk_result_5d_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists = (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'result_k3'
      AND CONSTRAINT_NAME = 'fk_result_k3_user_id'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE result_k3 ADD CONSTRAINT fk_result_k3_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 6) Orphan diagnostics for manual remediation.
SELECT 'recharge' AS table_name, COUNT(*) AS orphan_rows
FROM recharge
WHERE user_id IS NULL AND phone IS NOT NULL AND phone <> '' AND phone <> '0'
UNION ALL
SELECT 'withdraw', COUNT(*)
FROM withdraw
WHERE user_id IS NULL AND phone IS NOT NULL AND phone <> '' AND phone <> '0'
UNION ALL
SELECT 'minutes_1', COUNT(*)
FROM minutes_1
WHERE user_id IS NULL AND phone IS NOT NULL AND phone <> '' AND phone <> '0'
UNION ALL
SELECT 'result_5d', COUNT(*)
FROM result_5d
WHERE user_id IS NULL AND phone IS NOT NULL AND phone <> '' AND phone <> '0'
UNION ALL
SELECT 'result_k3', COUNT(*)
FROM result_k3
WHERE user_id IS NULL AND phone IS NOT NULL AND phone <> '' AND phone <> '0';
