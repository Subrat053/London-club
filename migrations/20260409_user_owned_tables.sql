-- 2026-04-09
-- Add user_id ownership columns to business tables (backward-compatible)

DROP PROCEDURE IF EXISTS sp_alter_if_table_exists;
DELIMITER $$
CREATE PROCEDURE sp_alter_if_table_exists(IN p_table VARCHAR(64), IN p_alter_sql TEXT)
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_name = p_table
    ) THEN
        SET @stmt = CONCAT('ALTER TABLE `', p_table, '` ', p_alter_sql);
        PREPARE q FROM @stmt;
        EXECUTE q;
        DEALLOCATE PREPARE q;
    END IF;
END$$
DELIMITER ;

-- Core ownership columns
CALL sp_alter_if_table_exists('orders_wingo', 'ADD COLUMN IF NOT EXISTS user_id INT NULL');
CALL sp_alter_if_table_exists('orders_5d', 'ADD COLUMN IF NOT EXISTS user_id INT NULL');
CALL sp_alter_if_table_exists('orders_k3', 'ADD COLUMN IF NOT EXISTS user_id INT NULL');
CALL sp_alter_if_table_exists('minutes_1', 'ADD COLUMN IF NOT EXISTS user_id INT NULL');
CALL sp_alter_if_table_exists('result_5d', 'ADD COLUMN IF NOT EXISTS user_id INT NULL');
CALL sp_alter_if_table_exists('result_k3', 'ADD COLUMN IF NOT EXISTS user_id INT NULL');

CALL sp_alter_if_table_exists('recharge', 'ADD COLUMN IF NOT EXISTS user_id INT NULL');
CALL sp_alter_if_table_exists('withdraw', 'ADD COLUMN IF NOT EXISTS user_id INT NULL');
CALL sp_alter_if_table_exists('bank_account', 'ADD COLUMN IF NOT EXISTS user_id INT NULL');
CALL sp_alter_if_table_exists('user_bank', 'ADD COLUMN IF NOT EXISTS user_id INT NULL');
CALL sp_alter_if_table_exists('safe_transfers', 'ADD COLUMN IF NOT EXISTS user_id INT NULL');
CALL sp_alter_if_table_exists('safe', 'ADD COLUMN IF NOT EXISTS user_id INT NULL');

CALL sp_alter_if_table_exists('daily_activity', 'ADD COLUMN IF NOT EXISTS user_id INT NULL');
CALL sp_alter_if_table_exists('activity_rewards', 'ADD COLUMN IF NOT EXISTS user_id INT NULL');
CALL sp_alter_if_table_exists('vip_exp', 'ADD COLUMN IF NOT EXISTS user_id INT NULL');
CALL sp_alter_if_table_exists('turn_over', 'ADD COLUMN IF NOT EXISTS user_id INT NULL');
CALL sp_alter_if_table_exists('roses', 'ADD COLUMN IF NOT EXISTS user_id INT NULL');
CALL sp_alter_if_table_exists('rebate', 'ADD COLUMN IF NOT EXISTS user_id INT NULL');

-- Transfer history ownership
CALL sp_alter_if_table_exists('balance_transfer', 'ADD COLUMN IF NOT EXISTS sender_user_id INT NULL, ADD COLUMN IF NOT EXISTS receiver_user_id INT NULL');

-- Optional snapshots for report integrity
CALL sp_alter_if_table_exists('recharge', 'ADD COLUMN IF NOT EXISTS user_email VARCHAR(255) NULL, ADD COLUMN IF NOT EXISTS user_name VARCHAR(150) NULL');
CALL sp_alter_if_table_exists('withdraw', 'ADD COLUMN IF NOT EXISTS user_email VARCHAR(255) NULL, ADD COLUMN IF NOT EXISTS user_name VARCHAR(150) NULL');
CALL sp_alter_if_table_exists('balance_transfer', 'ADD COLUMN IF NOT EXISTS sender_email VARCHAR(255) NULL, ADD COLUMN IF NOT EXISTS receiver_email VARCHAR(255) NULL');

-- Indexes
CALL sp_alter_if_table_exists('orders_wingo', 'ADD INDEX IF NOT EXISTS idx_orders_wingo_user_id (user_id)');
CALL sp_alter_if_table_exists('orders_5d', 'ADD INDEX IF NOT EXISTS idx_orders_5d_user_id (user_id)');
CALL sp_alter_if_table_exists('orders_k3', 'ADD INDEX IF NOT EXISTS idx_orders_k3_user_id (user_id)');
CALL sp_alter_if_table_exists('minutes_1', 'ADD INDEX IF NOT EXISTS idx_minutes_1_user_id (user_id)');
CALL sp_alter_if_table_exists('result_5d', 'ADD INDEX IF NOT EXISTS idx_result_5d_user_id (user_id)');
CALL sp_alter_if_table_exists('result_k3', 'ADD INDEX IF NOT EXISTS idx_result_k3_user_id (user_id)');

CALL sp_alter_if_table_exists('recharge', 'ADD INDEX IF NOT EXISTS idx_recharge_user_id (user_id)');
CALL sp_alter_if_table_exists('withdraw', 'ADD INDEX IF NOT EXISTS idx_withdraw_user_id (user_id)');
CALL sp_alter_if_table_exists('bank_account', 'ADD INDEX IF NOT EXISTS idx_bank_account_user_id (user_id)');
CALL sp_alter_if_table_exists('user_bank', 'ADD INDEX IF NOT EXISTS idx_user_bank_user_id (user_id)');
CALL sp_alter_if_table_exists('safe_transfers', 'ADD INDEX IF NOT EXISTS idx_safe_transfers_user_id (user_id)');
CALL sp_alter_if_table_exists('safe', 'ADD INDEX IF NOT EXISTS idx_safe_user_id (user_id)');

CALL sp_alter_if_table_exists('daily_activity', 'ADD INDEX IF NOT EXISTS idx_daily_activity_user_id (user_id)');
CALL sp_alter_if_table_exists('activity_rewards', 'ADD INDEX IF NOT EXISTS idx_activity_rewards_user_id (user_id)');
CALL sp_alter_if_table_exists('vip_exp', 'ADD INDEX IF NOT EXISTS idx_vip_exp_user_id (user_id)');
CALL sp_alter_if_table_exists('turn_over', 'ADD INDEX IF NOT EXISTS idx_turn_over_user_id (user_id)');
CALL sp_alter_if_table_exists('roses', 'ADD INDEX IF NOT EXISTS idx_roses_user_id (user_id)');
CALL sp_alter_if_table_exists('rebate', 'ADD INDEX IF NOT EXISTS idx_rebate_user_id (user_id)');
CALL sp_alter_if_table_exists('balance_transfer', 'ADD INDEX IF NOT EXISTS idx_balance_transfer_sender_user_id (sender_user_id), ADD INDEX IF NOT EXISTS idx_balance_transfer_receiver_user_id (receiver_user_id)');

DROP PROCEDURE IF EXISTS sp_alter_if_table_exists;
