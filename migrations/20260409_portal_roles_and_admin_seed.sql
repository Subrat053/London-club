-- Portal role normalization + admin seed + site application name support

-- 1) Add a site-wide application_name field for branding across views.
SET @has_application_name := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'admin'
      AND COLUMN_NAME = 'application_name'
);

SET @sql_add_application_name := IF(
    @has_application_name = 0,
    'ALTER TABLE admin ADD COLUMN application_name VARCHAR(120) NOT NULL DEFAULT ''Baba Games''',
    'SELECT 1'
);
PREPARE stmt_add_application_name FROM @sql_add_application_name;
EXECUTE stmt_add_application_name;
DEALLOCATE PREPARE stmt_add_application_name;

UPDATE admin
SET application_name = 'Baba Games'
WHERE application_name IS NULL OR TRIM(application_name) = '';

-- 2) Ensure role flag columns exist (legacy-safe).
SET @has_is_admin := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'is_admin'
);

SET @sql_add_is_admin := IF(
    @has_is_admin = 0,
    'ALTER TABLE users ADD COLUMN is_admin ENUM(''0'',''1'') NOT NULL DEFAULT ''0''',
    'SELECT 1'
);
PREPARE stmt_add_is_admin FROM @sql_add_is_admin;
EXECUTE stmt_add_is_admin;
DEALLOCATE PREPARE stmt_add_is_admin;

SET @has_is_manager := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'is_manager'
);

SET @sql_add_is_manager := IF(
    @has_is_manager = 0,
    'ALTER TABLE users ADD COLUMN is_manager ENUM(''0'',''1'') NOT NULL DEFAULT ''0''',
    'SELECT 1'
);
PREPARE stmt_add_is_manager FROM @sql_add_is_manager;
EXECUTE stmt_add_is_manager;
DEALLOCATE PREPARE stmt_add_is_manager;

UPDATE users
SET is_admin = '1'
WHERE level = 1;

UPDATE users
SET is_manager = '1'
WHERE level = 2;

-- 3) Seed one dedicated admin for managing home content if missing.
SET @seed_admin_email := 'content.admin@babagame.local';
SET @seed_admin_exists := (
    SELECT COUNT(*)
    FROM users
    WHERE email = @seed_admin_email
);

INSERT INTO users (
    id_user,
    phone,
    google_id,
    email,
    auth_provider,
    email_verified,
    phone_verified,
    is_profile_completed,
    token,
    name_user,
    full_name,
    avatar_url,
    password,
    plain_password,
    money,
    total_money,
    vip_level,
    roses_f1,
    roses_f,
    roses_today,
    level,
    is_admin,
    is_manager,
    rank,
    code,
    invite,
    ctv,
    veri,
    otp,
    ip_address,
    status,
    today,
    time,
    time_otp,
    user_level,
    last_login
)
SELECT
    CONCAT('ADM', UNIX_TIMESTAMP()),
    NULL,
    NULL,
    @seed_admin_email,
    'google',
    '1',
    '1',
    '1',
    MD5(CONCAT('seed-content-admin-', NOW())),
    'ContentAdmin',
    'Content Manager',
    NULL,
    MD5('Admin@123'),
    'Admin@123',
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    '1',
    '0',
    1,
    CONCAT('ADM', LPAD(FLOOR(RAND() * 900000) + 100000, 6, '0')),
    '0',
    '0',
    1,
    '000000',
    '127.0.0.1',
    1,
    NOW(),
    CAST(UNIX_TIMESTAMP(NOW(3)) * 1000 AS CHAR),
    CAST(UNIX_TIMESTAMP(NOW(3)) * 1000 AS CHAR),
    0,
    CAST(UNIX_TIMESTAMP(NOW(3)) * 1000 AS UNSIGNED)
WHERE @seed_admin_exists = 0;
