-- 2026-04-09
-- Backfill user_id from legacy phone ownership and generate orphan report

DROP PROCEDURE IF EXISTS sp_backfill_user_id_from_phone;
DROP PROCEDURE IF EXISTS sp_orphan_count;

DELIMITER $$
CREATE PROCEDURE sp_backfill_user_id_from_phone(IN p_table VARCHAR(64), IN p_phone_col VARCHAR(64))
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_name = p_table
    ) THEN
        SET @stmt = CONCAT(
            'UPDATE `', p_table, '` t ',
            'JOIN users u ON u.phone = t.`', p_phone_col, '` ',
            'SET t.user_id = u.id ',
            'WHERE t.user_id IS NULL ',
            'AND t.`', p_phone_col, '` IS NOT NULL ',
            'AND t.`', p_phone_col, '` <> '''' ',
            'AND t.`', p_phone_col, '` <> ''0''' 
        );
        PREPARE q FROM @stmt;
        EXECUTE q;
        DEALLOCATE PREPARE q;
    END IF;
END$$

CREATE PROCEDURE sp_orphan_count(IN p_table VARCHAR(64), IN p_phone_col VARCHAR(64))
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_name = p_table
    ) THEN
        SET @stmt = CONCAT(
            'INSERT INTO migration_orphans(table_name, orphan_rows) ',
            'SELECT ''', p_table, ''', COUNT(*) ',
            'FROM `', p_table, '` t ',
            'WHERE t.user_id IS NULL ',
            'AND t.`', p_phone_col, '` IS NOT NULL ',
            'AND t.`', p_phone_col, '` <> '''' ',
            'AND t.`', p_phone_col, '` <> ''0''' 
        );
        PREPARE q FROM @stmt;
        EXECUTE q;
        DEALLOCATE PREPARE q;
    END IF;
END$$
DELIMITER ;

-- Backfill main ownership tables
CALL sp_backfill_user_id_from_phone('orders_wingo', 'phone');
CALL sp_backfill_user_id_from_phone('orders_5d', 'phone');
CALL sp_backfill_user_id_from_phone('orders_k3', 'phone');
CALL sp_backfill_user_id_from_phone('minutes_1', 'phone');
CALL sp_backfill_user_id_from_phone('result_5d', 'phone');
CALL sp_backfill_user_id_from_phone('result_k3', 'phone');

CALL sp_backfill_user_id_from_phone('recharge', 'phone');
CALL sp_backfill_user_id_from_phone('withdraw', 'phone');
CALL sp_backfill_user_id_from_phone('bank_account', 'phone');
CALL sp_backfill_user_id_from_phone('user_bank', 'phone');
CALL sp_backfill_user_id_from_phone('safe_transfers', 'phone');
CALL sp_backfill_user_id_from_phone('safe', 'phone');

CALL sp_backfill_user_id_from_phone('daily_activity', 'phone');
CALL sp_backfill_user_id_from_phone('activity_rewards', 'phone');
CALL sp_backfill_user_id_from_phone('vip_exp', 'phone');
CALL sp_backfill_user_id_from_phone('turn_over', 'phone');
CALL sp_backfill_user_id_from_phone('roses', 'phone');
CALL sp_backfill_user_id_from_phone('rebate', 'phone');

-- Backfill balance transfer sender/receiver ownership
UPDATE balance_transfer bt
JOIN users us ON us.phone = bt.sender_phone
SET bt.sender_user_id = us.id,
    bt.sender_email = COALESCE(bt.sender_email, us.email)
WHERE bt.sender_user_id IS NULL
  AND bt.sender_phone IS NOT NULL
  AND bt.sender_phone <> ''
  AND bt.sender_phone <> '0';

UPDATE balance_transfer bt
JOIN users ur ON ur.phone = bt.receiver_phone
SET bt.receiver_user_id = ur.id,
    bt.receiver_email = COALESCE(bt.receiver_email, ur.email)
WHERE bt.receiver_user_id IS NULL
  AND bt.receiver_phone IS NOT NULL
  AND bt.receiver_phone <> ''
  AND bt.receiver_phone <> '0';

-- Snapshot backfill for reporting
UPDATE recharge r
JOIN users u ON u.id = r.user_id
SET r.user_email = COALESCE(r.user_email, u.email),
    r.user_name = COALESCE(r.user_name, u.full_name, u.name_user)
WHERE r.user_id IS NOT NULL;

UPDATE withdraw w
JOIN users u ON u.id = w.user_id
SET w.user_email = COALESCE(w.user_email, u.email),
    w.user_name = COALESCE(w.user_name, u.full_name, u.name_user)
WHERE w.user_id IS NOT NULL;

-- Orphan report
DROP TEMPORARY TABLE IF EXISTS migration_orphans;
CREATE TEMPORARY TABLE migration_orphans (
    table_name VARCHAR(64) NOT NULL,
    orphan_rows BIGINT NOT NULL
);

CALL sp_orphan_count('orders_wingo', 'phone');
CALL sp_orphan_count('orders_5d', 'phone');
CALL sp_orphan_count('orders_k3', 'phone');
CALL sp_orphan_count('minutes_1', 'phone');
CALL sp_orphan_count('result_5d', 'phone');
CALL sp_orphan_count('result_k3', 'phone');
CALL sp_orphan_count('recharge', 'phone');
CALL sp_orphan_count('withdraw', 'phone');
CALL sp_orphan_count('bank_account', 'phone');
CALL sp_orphan_count('user_bank', 'phone');
CALL sp_orphan_count('safe_transfers', 'phone');
CALL sp_orphan_count('safe', 'phone');
CALL sp_orphan_count('daily_activity', 'phone');
CALL sp_orphan_count('activity_rewards', 'phone');
CALL sp_orphan_count('vip_exp', 'phone');
CALL sp_orphan_count('turn_over', 'phone');
CALL sp_orphan_count('roses', 'phone');
CALL sp_orphan_count('rebate', 'phone');

SELECT * FROM migration_orphans ORDER BY orphan_rows DESC, table_name ASC;

DROP PROCEDURE IF EXISTS sp_backfill_user_id_from_phone;
DROP PROCEDURE IF EXISTS sp_orphan_count;
