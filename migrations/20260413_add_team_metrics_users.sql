-- 2026-04-13
-- Add optional team metrics columns used by promotion/team dashboards.
-- Idempotent migration for older production schemas.

SET @has_team_reg_number := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'team_reg_number'
);

SET @sql_add_team_reg_number := IF(
    @has_team_reg_number = 0,
    'ALTER TABLE users ADD COLUMN team_reg_number INT NOT NULL DEFAULT 0 AFTER roses_today',
    'SELECT 1'
);

PREPARE stmt_add_team_reg_number FROM @sql_add_team_reg_number;
EXECUTE stmt_add_team_reg_number;
DEALLOCATE PREPARE stmt_add_team_reg_number;

SET @has_team_deposit_amount := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'team_deposit_amount'
);

SET @sql_add_team_deposit_amount := IF(
    @has_team_deposit_amount = 0,
    'ALTER TABLE users ADD COLUMN team_deposit_amount DECIMAL(20,2) NOT NULL DEFAULT 0.00 AFTER team_reg_number',
    'SELECT 1'
);

PREPARE stmt_add_team_deposit_amount FROM @sql_add_team_deposit_amount;
EXECUTE stmt_add_team_deposit_amount;
DEALLOCATE PREPARE stmt_add_team_deposit_amount;

SET @has_team_deposit_number := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'team_deposit_number'
);

SET @sql_add_team_deposit_number := IF(
    @has_team_deposit_number = 0,
    'ALTER TABLE users ADD COLUMN team_deposit_number INT NOT NULL DEFAULT 0 AFTER team_deposit_amount',
    'SELECT 1'
);

PREPARE stmt_add_team_deposit_number FROM @sql_add_team_deposit_number;
EXECUTE stmt_add_team_deposit_number;
DEALLOCATE PREPARE stmt_add_team_deposit_number;

SET @has_team_first_deposit := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'team_first_deposit'
);

SET @sql_add_team_first_deposit := IF(
    @has_team_first_deposit = 0,
    'ALTER TABLE users ADD COLUMN team_first_deposit INT NOT NULL DEFAULT 0 AFTER team_deposit_number',
    'SELECT 1'
);

PREPARE stmt_add_team_first_deposit FROM @sql_add_team_first_deposit;
EXECUTE stmt_add_team_first_deposit;
DEALLOCATE PREPARE stmt_add_team_first_deposit;

UPDATE users
SET
    team_reg_number = IFNULL(team_reg_number, 0),
    team_deposit_amount = IFNULL(team_deposit_amount, 0.00),
    team_deposit_number = IFNULL(team_deposit_number, 0),
    team_first_deposit = IFNULL(team_first_deposit, 0);
