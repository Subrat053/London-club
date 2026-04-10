-- Promote the latest active verified email-based account to admin
-- Useful in fresh setups where Google login creates standard users first.

SET @latest_active_email_user_id := (
    SELECT id
    FROM users
    WHERE email IS NOT NULL
      AND email <> ''
      AND email NOT LIKE '%@babagame.local'
      AND status = 1
      AND veri = 1
      AND (level <> 1 AND is_admin = '0')
    ORDER BY COALESCE(last_login, 0) DESC, id DESC
    LIMIT 1
);

UPDATE users
SET
    level = 1,
    is_admin = '1',
    is_manager = '0'
WHERE id = @latest_active_email_user_id;
