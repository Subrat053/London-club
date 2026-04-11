#!/usr/bin/env node

const mysql = require('mysql2/promise');
const md5 = require('md5');
require('dotenv').config();

// Direct configuration so this script is fully standalone (no .env dependency).
const DIRECT_DB_CONFIG = {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT, 10) || 3306,
    user: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'babagames',
    poolSize: parseInt(process.env.DATABASE_POOL_SIZE, 10) || 5,
};

const DIRECT_ADMIN_CONFIG = {
    email: 'olaroclub@gmail.com',
    password: 'Admin@123',
    name: 'System Admin',
    phone: '',
};

const randomNumber = (min, max) => String(Math.floor(Math.random() * (max - min + 1)) + min);

const parseArgs = (argv) => {
    const args = {};
    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (!token.startsWith('--')) {
            continue;
        }
        const key = token.slice(2);
        const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : 'true';
        args[key] = value;
        if (value !== 'true') {
            i += 1;
        }
    }
    return args;
};

const createPlaceholderPhone = () => `9${Date.now().toString().slice(-9)}`;

const createPool = () => mysql.createPool({
    host: DIRECT_DB_CONFIG.host,
    port: Number(DIRECT_DB_CONFIG.port),
    user: DIRECT_DB_CONFIG.user,
    password: DIRECT_DB_CONFIG.password,
    database: DIRECT_DB_CONFIG.database,
    waitForConnections: true,
    connectionLimit: Number(DIRECT_DB_CONFIG.poolSize || 5),
    queueLimit: 0,
});

const safeFindUserByIdentifier = async (connection, email, phone) => {
    try {
        const [rows] = await connection.query(
            'SELECT * FROM users WHERE email = ? OR phone = ? LIMIT 1',
            [email, phone]
        );
        return rows[0] || null;
    } catch (error) {
        if (error?.code !== 'ER_BAD_FIELD_ERROR') {
            throw error;
        }
    }

    const [fallbackRows] = await connection.query(
        'SELECT * FROM users WHERE phone = ? LIMIT 1',
        [phone]
    );
    return fallbackRows[0] || null;
};

const generateUniqueCode = async (connection) => {
    for (let i = 0; i < 10; i += 1) {
        const code = `ADM${randomNumber(100000, 999999)}`;
        const [rows] = await connection.query('SELECT id FROM users WHERE code = ? LIMIT 1', [code]);
        if (!rows.length) {
            return code;
        }
    }

    return `ADM${Date.now().toString().slice(-8)}`;
};

const generateUniquePhone = async (connection, preferredPhone) => {
    const normalized = String(preferredPhone || '').trim();
    if (normalized) {
        const [rows] = await connection.query('SELECT id FROM users WHERE phone = ? LIMIT 1', [normalized]);
        if (!rows.length) {
            return normalized;
        }
    }

    for (let i = 0; i < 10; i += 1) {
        const phone = createPlaceholderPhone();
        const [rows] = await connection.query('SELECT id FROM users WHERE phone = ? LIMIT 1', [phone]);
        if (!rows.length) {
            return phone;
        }
    }

    return `9${Date.now().toString().slice(-8)}${randomNumber(10, 99)}`;
};

const ensureColumnExists = async (connection, columnName, definitionSql) => {
    const [rows] = await connection.query(
        `SELECT COUNT(*) AS total
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'users'
           AND COLUMN_NAME = ?`,
        [columnName]
    );

    const exists = Number(rows?.[0]?.total || 0) > 0;
    if (exists) {
        return;
    }

    await connection.query(`ALTER TABLE users ADD COLUMN ${definitionSql}`);
};

const ensureAdminColumns = async (connection) => {
    await ensureColumnExists(connection, 'is_admin', "is_admin ENUM('0','1') NOT NULL DEFAULT '0'");
    await ensureColumnExists(connection, 'is_manager', "is_manager ENUM('0','1') NOT NULL DEFAULT '0'");
};

const getUsersTableColumns = async (connection) => {
    const [rows] = await connection.query(
        `SELECT COLUMN_NAME
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'users'`
    );
    return new Set(rows.map((row) => String(row.COLUMN_NAME || '').trim()));
};

const buildColumnAssignments = (availableColumns, values = {}, rawValues = {}) => {
    const assignments = [];
    const params = [];

    Object.keys(values).forEach((column) => {
        if (!availableColumns.has(column)) {
            return;
        }
        assignments.push(`\`${column}\` = ?`);
        params.push(values[column]);
    });

    Object.keys(rawValues).forEach((column) => {
        if (!availableColumns.has(column)) {
            return;
        }
        assignments.push(`\`${column}\` = ${rawValues[column]}`);
    });

    return { assignments, params };
};

const updateAdminUser = async (connection, availableColumns, userId, payload) => {
    const values = {
        email: payload.email,
        phone: payload.phone,
        name_user: payload.displayName,
        full_name: payload.displayName,
        password: payload.passwordHash,
        plain_password: payload.password,
        veri: 1,
        status: 1,
        level: 1,
        is_admin: '1',
        is_manager: '0',
        last_login: payload.now,
    };

    const rawValues = {
        auth_provider: "'password'",
        email_verified: "'1'",
    };

    const { assignments, params } = buildColumnAssignments(availableColumns, values, rawValues);
    if (!assignments.length) {
        return;
    }

    params.push(userId);
    await connection.query(`UPDATE users SET ${assignments.join(', ')} WHERE \`id\` = ?`, params);
};

const insertAdminUser = async (connection, availableColumns, payload) => {
    const values = {
        id_user: payload.idUser,
        phone: payload.phone,
        google_id: null,
        email: payload.email,
        token: '',
        name_user: payload.displayName,
        full_name: payload.displayName,
        avatar_url: null,
        password: payload.passwordHash,
        plain_password: payload.password,
        money: 0,
        total_money: 0,
        vip_level: 0,
        roses_f1: 0,
        roses_f: 0,
        roses_today: 0,
        level: 1,
        is_admin: '1',
        is_manager: '0',
        rank: 1,
        code: payload.code,
        invite: '0',
        ctv: '0',
        veri: 1,
        otp: '000000',
        ip_address: '127.0.0.1',
        status: 1,
        time: payload.nowString,
        time_otp: payload.nowString,
        user_level: 0,
        last_login: payload.now,
    };

    const rawValues = {
        auth_provider: "'password'",
        email_verified: "'1'",
        phone_verified: "'1'",
        is_profile_completed: "'1'",
        today: 'NOW()',
    };

    const { assignments, params } = buildColumnAssignments(availableColumns, values, rawValues);
    if (!assignments.length) {
        throw new Error('No compatible columns found to insert admin user');
    }

    await connection.query(`INSERT INTO \`users\` SET ${assignments.join(', ')}`, params);
};

const main = async () => {
    const args = parseArgs(process.argv.slice(2));

    const email = String(args.email || DIRECT_ADMIN_CONFIG.email || '').trim().toLowerCase();
    const password = String(args.password || DIRECT_ADMIN_CONFIG.password || '').trim();
    const fullName = String(args.name || DIRECT_ADMIN_CONFIG.name || 'System Admin').trim();
    const requestedPhone = String(args.phone || DIRECT_ADMIN_CONFIG.phone || '').trim();

    if (!email || !password) {
        console.error('Set DIRECT_ADMIN_CONFIG values in this file or pass args: --email --password [--name] [--phone]');
        process.exitCode = 1;
        return;
    }

    const pool = createPool();
    const connection = await pool.getConnection();

    try {
        await ensureAdminColumns(connection);

        const now = Date.now();
        const nowString = String(now);
        const displayName = fullName || email.split('@')[0] || `Admin${randomNumber(1000, 9999)}`;
        const safePhone = await generateUniquePhone(connection, requestedPhone);
        const usersColumns = await getUsersTableColumns(connection);

        const existingUser = await safeFindUserByIdentifier(connection, email, safePhone);
        const passwordHash = md5(password);

        if (existingUser) {
            await updateAdminUser(connection, usersColumns, existingUser.id, {
                email,
                phone: existingUser.phone || safePhone,
                displayName,
                password,
                passwordHash,
                now,
            });

            console.log('Admin user updated successfully.');
            console.log(`Email: ${email}`);
            console.log(`Login URL: /admin/login`);
            return;
        }

        const code = await generateUniqueCode(connection);
        const idUser = randomNumber(10000, 99999);

        await insertAdminUser(connection, usersColumns, {
            idUser,
            phone: safePhone,
            email,
            displayName,
            password,
            passwordHash,
            code,
            now,
            nowString,
        });

        console.log('Admin user created successfully.');
        console.log(`Email: ${email}`);
        console.log(`Phone: ${safePhone}`);
        console.log('Login URL: /admin/login');
    } finally {
        connection.release();
        await pool.end();
    }
};

main().catch((error) => {
    console.error('Failed to seed admin user:', error?.message || error);
    process.exitCode = 1;
});
