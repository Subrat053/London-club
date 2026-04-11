-- 2026-04-11
-- Add missing referral carry-over column used by promotion and daily reset flows.

SET @has_roses_yesterday := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'roses_yesterday'
);

SET @sql_add_roses_yesterday := IF(
    @has_roses_yesterday = 0,
    'ALTER TABLE users ADD COLUMN roses_yesterday DECIMAL(20,2) NOT NULL DEFAULT 0.00 AFTER roses_today',
    'SELECT 1'
);

PREPARE stmt_add_roses_yesterday FROM @sql_add_roses_yesterday;
EXECUTE stmt_add_roses_yesterday;
DEALLOCATE PREPARE stmt_add_roses_yesterday;

UPDATE users
SET roses_yesterday = 0.00
WHERE roses_yesterday IS NULL;
