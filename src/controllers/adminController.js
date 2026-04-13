import connection from "../config/connectDB";
import jwt from 'jsonwebtoken'
import md5 from "md5";
import { sendStatus } from './activityController';
import cron from 'node-cron';
import { buildOwnershipWhereClause, resolveUserByIdentifier } from '../services/sessionService';
import { invalidateSiteSettingsCache, DEFAULT_APPLICATION_NAME } from '../services/siteSettingsService';
import { requireAdmin } from '../core/middlewares/auth';
require('dotenv').config();

const { Worker } = require('worker_threads');
const path = require('path');
let timeNow = Date.now();

let invitationBouceList =[
    {invitationNo:1,rewardMoney:55},
    {invitationNo:3,rewardMoney:155},
    {invitationNo:10,rewardMoney:555},
    {invitationNo:30,rewardMoney:1555},
    {invitationNo:70,rewardMoney:3355},
    {invitationNo:200,rewardMoney:10955},
    {invitationNo:500,rewardMoney:25555},
    {invitationNo:1000,rewardMoney:48555},
    {invitationNo:5000,rewardMoney:355555},
    {invitationNo:10000,rewardMoney:755555},
    {invitationNo:20000,rewardMoney:1555555},
    {invitationNo:50000,rewardMoney:3555555},
]

const getMemberIdentifier = (req) => {
    return (
        req.params?.identifier ||
        req.params?.phone ||
        req.params?.id ||
        req.body?.identifier ||
        req.body?.email ||
        req.body?.phone ||
        req.body?.id ||
        ''
    );
}

const normalizeIdentity = (value) => String(value || '').trim();

const SQL_IDENTIFIER_PATTERN = /^[A-Za-z0-9_]+$/;

const isSafeSqlIdentifier = (value) => SQL_IDENTIFIER_PATTERN.test(String(value || ''));

const quoteSqlIdentifier = (value) => `\`${value}\``;

const getCurrentDatabaseName = async (connection1) => {
    const [rows] = await connection1.query('SELECT DATABASE() AS dbName');
    return rows?.[0]?.dbName || '';
};

const getUserReferenceValue = (member, columnName) => {
    if (!member || !columnName) return null;
    const mapper = {
        id: member.id,
        user_id: member.id,
        id_user: member.id_user,
        phone: normalizeIdentity(member.phone),
        phone_used: normalizeIdentity(member.phone),
        email: normalizeIdentity(member.email),
    };
    return mapper[columnName] ?? null;
};

const deleteUserRowsByForeignKeys = async (connection1, dbName, member) => {
    if (!dbName) return;

    const [fkRows] = await connection1.query(
        `SELECT TABLE_NAME, COLUMN_NAME, REFERENCED_COLUMN_NAME
         FROM information_schema.KEY_COLUMN_USAGE
         WHERE TABLE_SCHEMA = ?
           AND REFERENCED_TABLE_SCHEMA = ?
           AND REFERENCED_TABLE_NAME = 'users'`,
        [dbName, dbName]
    );

    const protectedTables = new Set(['users', 'admin']);
    for (const row of fkRows) {
        const tableName = String(row?.TABLE_NAME || '').trim();
        const columnName = String(row?.COLUMN_NAME || '').trim();
        const referencedColumn = String(row?.REFERENCED_COLUMN_NAME || '').trim();

        if (!tableName || !columnName || !referencedColumn) continue;
        if (protectedTables.has(tableName)) continue;
        if (!isSafeSqlIdentifier(tableName) || !isSafeSqlIdentifier(columnName) || !isSafeSqlIdentifier(referencedColumn)) continue;

        const refValue = getUserReferenceValue(member, referencedColumn);
        if (refValue === null || refValue === undefined || refValue === '') continue;

        await connection1.query(
            `DELETE FROM ${quoteSqlIdentifier(tableName)} WHERE ${quoteSqlIdentifier(columnName)} = ?`,
            [refValue]
        );
    }
};

const deleteUserRowsBySchemaColumns = async (connection1, dbName, member) => {
    if (!dbName) return;

    const candidateColumns = ['user_id', 'id_user', 'phone', 'phone_used', 'email'];
    const placeholders = candidateColumns.map(() => '?').join(', ');
    const [columnRows] = await connection1.query(
        `SELECT TABLE_NAME, COLUMN_NAME
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND COLUMN_NAME IN (${placeholders})`,
        [dbName, ...candidateColumns]
    );

    const protectedTables = new Set(['users', 'admin']);
    const tableMap = new Map();

    for (const row of columnRows) {
        const tableName = String(row?.TABLE_NAME || '').trim();
        const columnName = String(row?.COLUMN_NAME || '').trim();
        if (!tableName || !columnName) continue;
        if (protectedTables.has(tableName)) continue;
        if (!isSafeSqlIdentifier(tableName) || !isSafeSqlIdentifier(columnName)) continue;

        const refValue = getUserReferenceValue(member, columnName);
        if (refValue === null || refValue === undefined || refValue === '') continue;

        if (!tableMap.has(tableName)) {
            tableMap.set(tableName, new Set());
        }
        tableMap.get(tableName).add(columnName);
    }

    const sortedTables = Array.from(tableMap.keys()).sort((a, b) => a.localeCompare(b));
    for (const tableName of sortedTables) {
        const columns = Array.from(tableMap.get(tableName) || []);
        for (const columnName of columns) {
            const refValue = getUserReferenceValue(member, columnName);
            if (refValue === null || refValue === undefined || refValue === '') continue;
            await connection1.query(
                `DELETE FROM ${quoteSqlIdentifier(tableName)} WHERE ${quoteSqlIdentifier(columnName)} = ?`,
                [refValue]
            );
        }
    }
};

const getCtvIdentityKeys = (user = {}) => {
    const keys = [user?.phone, user?.email, user?.code]
        .map(normalizeIdentity)
        .filter((entry) => entry && entry !== '0');
    return [...new Set(keys)];
}

const buildCtvScope = (user = {}) => {
    const keys = getCtvIdentityKeys(user);
    if (!keys.length) {
        return { clause: '1 = 0', params: [] };
    }
    return {
        clause: `ctv IN (${keys.map(() => '?').join(',')})`,
        params: keys,
    };
}

const loadMemberRedenvelopeUsage = async (member, pageno, limit) => {
    if (member?.id) {
        try {
            const [rows] = await connection.query(
                `SELECT * FROM redenvelopes_used WHERE user_id = ? ORDER BY id DESC LIMIT ${pageno}, ${limit}`,
                [member.id]
            );
            const [totals] = await connection.query(
                'SELECT COUNT(1) AS total FROM redenvelopes_used WHERE user_id = ?',
                [member.id]
            );
            return { rows, total: totals[0]?.total || 0 };
        } catch (error) {
            if (error?.code !== 'ER_BAD_FIELD_ERROR') {
                throw error;
            }
        }
    }

    const memberPhone = member?.phone || '__NO_PHONE__';
    const [rows] = await connection.query(
        `SELECT * FROM redenvelopes_used WHERE phone_used = ? ORDER BY id DESC LIMIT ${pageno}, ${limit}`,
        [memberPhone]
    );
    const [totals] = await connection.query(
        'SELECT COUNT(1) AS total FROM redenvelopes_used WHERE phone_used = ?',
        [memberPhone]
    );
    return { rows, total: totals[0]?.total || 0 };
}

const adminPage = async (req, res) => {
    return res.render("manage/index.ejs");
}

const adminPortalPage = async (req, res) => {
    return res.render("manage/portal.ejs");
}

const adminPage3 = async (req, res) => {
    return res.render("manage/a-index-bet/index3.ejs");
}

const adminPage5 = async (req, res) => {
    return res.render("manage/a-index-bet/index5.ejs");
}

const adminPage10 = async (req, res) => {
    return res.render("manage/a-index-bet/index10.ejs");
}

const adminPage5d = async (req, res) => {
    return res.render("manage/5d.ejs");
}

const adminPageK3 = async (req, res) => {
    return res.render("manage/k3.ejs");
}

const ctvProfilePage = async (req, res) => {
    var phone = req.params.phone;
    return res.render("manage/profileCTV.ejs", { phone });
}

const giftPage = async (req, res) => {
    return res.render("manage/giftPage.ejs");
}

const membersPage = async (req, res) => {
    return res.render("manage/members.ejs");
}

const ctvPage = async (req, res) => {
    return res.render("manage/ctv.ejs");
}

const infoMember = async (req, res) => {
    const identifier = getMemberIdentifier(req);
    return res.render("manage/profileMember.ejs", { phone: identifier });
}

const statistical = async (req, res) => {
    return res.render("manage/statistical.ejs");
}

const rechargePage = async (req, res) => {
    return res.render("manage/recharge.ejs");
}
const rechargeBonus = async (req, res) => {
    return res.render("manage/rechargeBonus.ejs");
}


const rechargeRecord = async (req, res) => {
    return res.render("manage/rechargeRecord.ejs");
}

const withdraw = async (req, res) => {
    return res.render("manage/withdraw.ejs");
}

const levelSetting = async (req, res) => {
    return res.render("manage/levelSetting.ejs");
}

const CreatedSalaryRecord = async (req, res) => {
    return res.render("manage/CreatedSalaryRecord.ejs");
}

const withdrawRecord = async (req, res) => {
    return res.render("manage/withdrawRecord.ejs");
}
const settings = async (req, res) => {
    return res.render("manage/settings.ejs");
}

const DEFAULT_HOME_CAROUSEL_BANNERS = [
    { image_url: '/img/banner/banner-1.png', link_url: '', sort_order: 1, is_active: 1 },
    { image_url: '/img/banner/banner-2.png', link_url: '', sort_order: 2, is_active: 1 },
    { image_url: '/img/banner/banner-3.png', link_url: '', sort_order: 3, is_active: 1 },
    { image_url: '/img/banner/banner-4.jpg', link_url: '', sort_order: 4, is_active: 1 },
];

const DEFAULT_HOME_POPUP_BANNER = {
    title: 'SUPER EVENT !!!',
    message: 'Recharge on any London Club channel and get bonus offers on selected days.',
    image_url: '/img/banner/banner-2.png',
    button_text: 'VIP LONDON CLUB',
    button_link: '#',
    is_enabled: 1,
};

const normalizeText = (value, maxLength = 500) => String(value || '').trim().slice(0, maxLength);

const normalizeFlag = (value, fallback = 1) => {
    if (value === undefined || value === null || value === '') {
        return Number(fallback) === 1 ? 1 : 0;
    }
    if (typeof value === 'boolean') {
        return value ? 1 : 0;
    }
    const normalized = String(value).trim().toLowerCase();
    return ['1', 'true', 'yes', 'on'].includes(normalized) ? 1 : 0;
};

const parsePayloadObject = (value, fallback = {}) => {
    if (!value) return fallback;
    if (typeof value === 'object') return value;
    if (typeof value !== 'string') return fallback;
    try {
        const parsed = JSON.parse(value);
        return typeof parsed === 'object' && parsed ? parsed : fallback;
    } catch (error) {
        return fallback;
    }
};

const parsePayloadArray = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
};

const ensureHomeContentTables = async () => {
    await connection.query(`
        CREATE TABLE IF NOT EXISTS home_carousel_banners (
            id INT NOT NULL AUTO_INCREMENT,
            image_url VARCHAR(500) NOT NULL,
            link_url VARCHAR(500) NULL,
            sort_order INT NOT NULL DEFAULT 0,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
        CREATE TABLE IF NOT EXISTS home_popup_banner (
            id INT NOT NULL,
            title VARCHAR(200) NOT NULL,
            message TEXT NULL,
            image_url VARCHAR(500) NULL,
            button_text VARCHAR(100) NULL,
            button_link VARCHAR(500) NULL,
            is_enabled TINYINT(1) NOT NULL DEFAULT 1,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
};

const fetchHomeContentSettingsData = async () => {
    await ensureHomeContentTables();

    let [carouselRows] = await connection.query(
        'SELECT id, image_url, link_url, sort_order, is_active FROM home_carousel_banners ORDER BY sort_order ASC, id ASC'
    );

    if (!carouselRows.length) {
        carouselRows = DEFAULT_HOME_CAROUSEL_BANNERS.map((item, idx) => ({
            id: idx + 1,
            image_url: item.image_url,
            link_url: item.link_url,
            sort_order: item.sort_order,
            is_active: item.is_active,
        }));
    }

    const [popupRows] = await connection.query(
        'SELECT id, title, message, image_url, button_text, button_link, is_enabled FROM home_popup_banner WHERE id = 1 LIMIT 1'
    );

    const popup = popupRows.length
        ? {
            title: normalizeText(popupRows[0].title, 200),
            message: normalizeText(popupRows[0].message, 4000),
            image_url: normalizeText(popupRows[0].image_url, 500),
            button_text: normalizeText(popupRows[0].button_text, 100),
            button_link: normalizeText(popupRows[0].button_link, 500),
            is_enabled: normalizeFlag(popupRows[0].is_enabled, 1),
        }
        : { ...DEFAULT_HOME_POPUP_BANNER };

    let applicationName = DEFAULT_APPLICATION_NAME;
    try {
        const [adminRows] = await connection.query('SELECT application_name FROM admin LIMIT 1');
        const rawName = String(adminRows?.[0]?.application_name || '').trim();
        if (rawName) {
            applicationName = rawName;
        }
    } catch (error) {
        if (error?.code !== 'ER_BAD_FIELD_ERROR') {
            throw error;
        }
    }

    return {
        carousel: carouselRows,
        popup,
        application_name: applicationName,
    };
};

const contentManagerPage = async (req, res) => {
    return res.render('manage/contentManager.ejs');
};

const getHomeContentSettings = async (req, res) => {
    try {
        const data = await fetchHomeContentSettingsData();
        return res.status(200).json({
            message: 'Success',
            status: true,
            data,
        });
    } catch (error) {
        console.log('getHomeContentSettings error', error);
        return res.status(500).json({
            message: 'Failed to load home content settings',
            status: false,
        });
    }
};

const saveHomeContentSettings = async (req, res) => {
    let connection1;
    try {
        const carouselInput = parsePayloadArray(req.body?.carousel);
        const popupInput = parsePayloadObject(req.body?.popup, {});

        const normalizedCarousel = carouselInput
            .map((item, idx) => ({
                image_url: normalizeText(item?.image_url, 500),
                link_url: normalizeText(item?.link_url, 500),
                sort_order: Number(item?.sort_order || idx + 1),
                is_active: normalizeFlag(item?.is_active, 1),
            }))
            .filter((item) => item.image_url);

        if (!normalizedCarousel.length) {
            return res.status(200).json({
                message: 'Please provide at least one carousel banner image URL.',
                status: false,
            });
        }

        const normalizedPopup = {
            title: normalizeText(popupInput?.title || DEFAULT_HOME_POPUP_BANNER.title, 200),
            message: normalizeText(popupInput?.message || DEFAULT_HOME_POPUP_BANNER.message, 4000),
            image_url: normalizeText(popupInput?.image_url || DEFAULT_HOME_POPUP_BANNER.image_url, 500),
            button_text: normalizeText(popupInput?.button_text || DEFAULT_HOME_POPUP_BANNER.button_text, 100),
            button_link: normalizeText(popupInput?.button_link || DEFAULT_HOME_POPUP_BANNER.button_link, 500),
            is_enabled: normalizeFlag(popupInput?.is_enabled, DEFAULT_HOME_POPUP_BANNER.is_enabled),
        };

        const applicationName = normalizeText(req.body?.application_name || DEFAULT_APPLICATION_NAME, 120) || DEFAULT_APPLICATION_NAME;

        await ensureHomeContentTables();
        connection1 = await connection.getConnection();
        await connection1.beginTransaction();

        await connection1.query('DELETE FROM home_carousel_banners');
        for (const item of normalizedCarousel) {
            await connection1.query(
                'INSERT INTO home_carousel_banners (image_url, link_url, sort_order, is_active) VALUES (?, ?, ?, ?)',
                [item.image_url, item.link_url || null, item.sort_order, item.is_active]
            );
        }

        await connection1.query(
            `INSERT INTO home_popup_banner (id, title, message, image_url, button_text, button_link, is_enabled)
             VALUES (1, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                title = VALUES(title),
                message = VALUES(message),
                image_url = VALUES(image_url),
                button_text = VALUES(button_text),
                button_link = VALUES(button_link),
                is_enabled = VALUES(is_enabled)`,
            [
                normalizedPopup.title,
                normalizedPopup.message,
                normalizedPopup.image_url || null,
                normalizedPopup.button_text,
                normalizedPopup.button_link || null,
                normalizedPopup.is_enabled,
            ]
        );

        await connection1.query('UPDATE admin SET application_name = ?', [applicationName]);

        await connection1.commit();
        invalidateSiteSettingsCache();

        return res.status(200).json({
            message: 'Home content updated successfully.',
            status: true,
        });
    } catch (error) {
        if (connection1) {
            await connection1.rollback();
        }
        console.log('saveHomeContentSettings error', error);
        return res.status(500).json({
            message: 'Failed to save home content settings',
            status: false,
        });
    } finally {
        if (connection1) {
            connection1.release();
        }
    }
};


// xác nhận admin
const middlewareAdminController = async (req, res, next) => {
    return requireAdmin(req, res, next);
}

const totalJoin = async (req, res) => {
    let auth = req.cookies.auth;
    let typeid = req.body.typeid;
    if (!typeid) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
    let game = '';
    if (typeid == '1') game = 'wingo';
    if (typeid == '2') game = 'wingo3';
    if (typeid == '3') game = 'wingo5';
    if (typeid == '4') game = 'wingo10';

    const [rows] = await connection.query('SELECT * FROM users WHERE `token` = ? ', [auth]);

    if (rows.length > 0) {
        const [wingoall] = await connection.query(`SELECT * FROM minutes_1 WHERE game = "${game}" AND status = 0 AND level = 0 ORDER BY id ASC `, [auth]);
        const [winGo1] = await connection.execute(`SELECT * FROM wingo WHERE status = 0 AND game = '${game}' ORDER BY id DESC LIMIT 1 `, []);
        const [winGo10] = await connection.execute(`SELECT * FROM wingo WHERE status != 0 AND game = '${game}' ORDER BY id DESC LIMIT 10 `, []);
        const [setting] = await connection.execute(`SELECT * FROM admin `, []);

        return res.status(200).json({
            message: 'Success',
            status: true,
            datas: wingoall,
            lotterys: winGo1,
            list_orders: winGo10,
            setting: setting,
            timeStamp: timeNow,
        });
    } else {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
}

const listMember = async (req, res) => {
    const pageno = Number(req.body?.pageno);
    const limit = Number(req.body?.limit);

    if (!Number.isInteger(pageno) || !Number.isInteger(limit) || limit <= 0) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                gameslist: [],
            },
            status: false
        });
    }

    if (pageno < 0) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                gameslist: [],
            },
            status: false
        });
    }
    // Admin panel needs full visibility of all non-manager users, including Google users.
    const [users] = await connection.query(`SELECT * FROM users WHERE level != 2 ORDER BY id DESC LIMIT ${pageno}, ${limit} `);
    const [totalRows] = await connection.query('SELECT COUNT(1) AS total FROM users WHERE level != 2');
    const totalUsers = Number(totalRows[0]?.total || 0);

    return res.status(200).json({
        message: 'Success',
        status: true,
        datas: users,
        page_total: Math.max(1, Math.ceil(totalUsers / limit))
    });
}

const listCTV = async (req, res) => {
    const pageno = Number(req.body?.pageno);
    const pageto = Number(req.body?.pageto);

    if (!Number.isInteger(pageno) || !Number.isInteger(pageto) || pageto <= 0) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                gameslist: [],
            },
            status: false
        });
    }

    if (pageno < 0) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                gameslist: [],
            },
            status: false
        });
    }
    const [wingo] = await connection.query(`SELECT * FROM users WHERE level = 2 ORDER BY id DESC LIMIT ${pageno}, ${pageto} `);
    return res.status(200).json({
        message: 'Success',
        status: true,
        datas: wingo,
    });
}

function formateT2(params) {
    let result = (params < 10) ? "0" + params : params;
    return result;
}

function timerJoin2(params = '', addHours = 0) {
    let date = '';
    if (params) {
        date = new Date(Number(params));
    } else {
        date = new Date();
    }

    date.setHours(date.getHours() + addHours);

    let years = formateT(date.getFullYear());
    let months = formateT(date.getMonth() + 1);
    let days = formateT(date.getDate());

    let hours = date.getHours() % 12;
    hours = hours === 0 ? 12 : hours;
    let ampm = date.getHours() < 12 ? "AM" : "PM";

    let minutes = formateT(date.getMinutes());
    let seconds = formateT(date.getSeconds());

    return years + '-' + months + '-' + days + ' ' + hours + ':' + minutes + ':' + seconds + ' ' + ampm;
}

const statistical2 = async (req, res) => {
    const [wingo] = await connection.query(`SELECT SUM(money) as total FROM minutes_1 WHERE status = 1 `);
    const [wingo2] = await connection.query(`SELECT SUM(money) as total FROM minutes_1 WHERE status = 2 `);
    const [users] = await connection.query(`SELECT COUNT(id) as total FROM users WHERE status = 1 `);
    const [users2] = await connection.query(`SELECT COUNT(id) as total FROM users WHERE status = 0 `);
    const [recharge] = await connection.query(`SELECT SUM(money) as total FROM recharge WHERE status = 1 `);
    const [withdraw] = await connection.query(`SELECT SUM(money) as total FROM withdraw WHERE status = 1 `);

    const [recharge_today] = await connection.query(`SELECT SUM(money) as total FROM recharge WHERE status = 1 AND today = ?`, [timerJoin2()]);
    const [withdraw_today] = await connection.query(`SELECT SUM(money) as total FROM withdraw WHERE status = 1 AND today = ?`, [timerJoin2()]);

    let win = wingo[0].total;
    let loss = wingo2[0].total;
    let usersOnline = users[0].total;
    let usersOffline = users2[0].total;
    let recharges = recharge[0].total;
    let withdraws = withdraw[0].total;
    return res.status(200).json({
        message: 'Success',
        status: true,
        win: win,
        loss: loss,
        usersOnline: usersOnline,
        usersOffline: usersOffline,
        recharges: recharges,
        withdraws: withdraws,
        rechargeToday: recharge_today[0].total,
        withdrawToday: withdraw_today[0].total,
    });
}

const changeAdmin = async (req, res) => {
    let auth = req.cookies.auth;
    let value = req.body.value;
    let type = req.body.type;
    let typeid = req.body.typeid;

    if (!value || !type || !typeid) return res.status(200).json({
        message: 'Failed',
        status: false,
        timeStamp: timeNow,
    });;
    let game = '';
    let bs = '';
    if (typeid == '1') {
        game = 'wingo1';
        bs = 'bs1';
    }
    if (typeid == '2') {
        game = 'wingo3';
        bs = 'bs3';
    }
    if (typeid == '3') {
        game = 'wingo5';
        bs = 'bs5';
    }
    if (typeid == '4') {
        game = 'wingo10';
        bs = 'bs10';
    }
    switch (type) {
        case 'change-wingo1':
            await connection.query(`UPDATE admin SET ${game} = ? `, [value]);
            return res.status(200).json({
                message: 'Editing results successfully',
                status: true,
                timeStamp: timeNow,
            });
            break;
        case 'change-win_rate':
            await connection.query(`UPDATE admin SET ${bs} = ? `, [value]);
            return res.status(200).json({
                message: 'Editing win rate successfully',
                status: true,
                timeStamp: timeNow,
            });
            break;

        default:
            return res.status(200).json({
                message: 'Failed',
                status: false,
                timeStamp: timeNow,
            });
            break;
    }

}

function formateT(params) {
    let result = (params < 10) ? "0" + params : params;
    return result;
}

function timerJoin(params = '', addHours = 0) {
    let date = '';
    if (params) {
        date = new Date(Number(params));
    } else {
        date = new Date();
    }

    date.setHours(date.getHours() + addHours);

    let years = formateT(date.getFullYear());
    let months = formateT(date.getMonth() + 1);
    let days = formateT(date.getDate());

    let hours = date.getHours() % 12;
    hours = hours === 0 ? 12 : hours;
    let ampm = date.getHours() < 12 ? "AM" : "PM";

    let minutes = formateT(date.getMinutes());
    let seconds = formateT(date.getSeconds());

    return years + '-' + months + '-' + days + ' ' + hours + ':' + minutes + ':' + seconds + ' ' + ampm;
}

const userInfo = async (req, res) => {
    let auth = req.cookies.auth;
    let identifier = getMemberIdentifier(req);
    if (!identifier) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }

    const member = await resolveUserByIdentifier(identifier);
    if (!member) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
    let userInfo = member;
    // direct subordinate all
    const [f1s] = await connection.query('SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ', [userInfo.code]);

    // cấp dưới trực tiếp hôm nay 
    let f1_today = 0;
    for (let i = 0; i < f1s.length; i++) {
        const f1_time = f1s[i].time; // Mã giới thiệu f1
        let check = (timerJoin(f1_time) == timerJoin()) ? true : false;
        if (check) {
            f1_today += 1;
        }
    }

    // tất cả cấp dưới hôm nay 
    let f_all_today = 0;
    for (let i = 0; i < f1s.length; i++) {
        const f1_code = f1s[i].code; // Mã giới thiệu f1
        const f1_time = f1s[i].time; // time f1
        let check_f1 = (timerJoin(f1_time) == timerJoin()) ? true : false;
        if (check_f1) f_all_today += 1;
        // tổng f1 mời đc hôm nay
        const [f2s] = await connection.query('SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ', [f1_code]);
        for (let i = 0; i < f2s.length; i++) {
            const f2_code = f2s[i].code; // Mã giới thiệu f2
            const f2_time = f2s[i].time; // time f2
            let check_f2 = (timerJoin(f2_time) == timerJoin()) ? true : false;
            if (check_f2) f_all_today += 1;
            // tổng f2 mời đc hôm nay
            const [f3s] = await connection.query('SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ', [f2_code]);
            for (let i = 0; i < f3s.length; i++) {
                const f3_code = f3s[i].code; // Mã giới thiệu f3
                const f3_time = f3s[i].time; // time f3
                let check_f3 = (timerJoin(f3_time) == timerJoin()) ? true : false;
                if (check_f3) f_all_today += 1;
                const [f4s] = await connection.query('SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ', [f3_code]);
                // tổng f3 mời đc hôm nay
                for (let i = 0; i < f4s.length; i++) {
                    const f4_code = f4s[i].code; // Mã giới thiệu f4
                    const f4_time = f4s[i].time; // time f4
                    let check_f4 = (timerJoin(f4_time) == timerJoin()) ? true : false;
                    if (check_f4) f_all_today += 1;
                    // tổng f3 mời đc hôm nay
                }
            }
        }
    }

    // Tổng số f2
    let f2 = 0;
    for (let i = 0; i < f1s.length; i++) {
        const f1_code = f1s[i].code; // Mã giới thiệu f1
        const [f2s] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ', [f1_code]);
        f2 += f2s.length;
    }

    // Tổng số f3
    let f3 = 0;
    for (let i = 0; i < f1s.length; i++) {
        const f1_code = f1s[i].code; // Mã giới thiệu f1
        const [f2s] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ', [f1_code]);
        for (let i = 0; i < f2s.length; i++) {
            const f2_code = f2s[i].code;
            const [f3s] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ', [f2_code]);
            if (f3s.length > 0) f3 += f3s.length;
        }
    }

    // Tổng số f4
    let f4 = 0;
    for (let i = 0; i < f1s.length; i++) {
        const f1_code = f1s[i].code; // Mã giới thiệu f1
        const [f2s] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ', [f1_code]);
        for (let i = 0; i < f2s.length; i++) {
            const f2_code = f2s[i].code;
            const [f3s] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ', [f2_code]);
            for (let i = 0; i < f3s.length; i++) {
                const f3_code = f3s[i].code;
                const [f4s] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ', [f3_code]);
                if (f4s.length > 0) f4 += f4s.length;
            }
        }
    }
    // console.log("TOTAL_F_TODAY:" + f_all_today);
    // console.log("F1: " + f1s.length);
    // console.log("F2: " + f2);
    // console.log("F3: " + f3);
    // console.log("F4: " + f4);

    const ownership = buildOwnershipWhereClause(member, 'user_id', 'phone');
    const [recharge] = await connection.query(`SELECT SUM(money) as total FROM recharge WHERE ${ownership.clause} AND status = 1`, ownership.params);
    const [withdraw] = await connection.query(`SELECT SUM(money) as total FROM withdraw WHERE ${ownership.clause} AND status = 1`, ownership.params);
    let bank_user = [];
    try {
        if (member?.id) {
            [bank_user] = await connection.query('SELECT * FROM user_bank WHERE user_id = ? ', [member.id]);
        } else {
            [bank_user] = await connection.query('SELECT * FROM user_bank WHERE phone = ? ', [member.phone || '__NO_PHONE__']);
        }
    } catch (error) {
        if (error?.code !== 'ER_BAD_FIELD_ERROR') {
            throw error;
        }
        [bank_user] = await connection.query('SELECT * FROM user_bank WHERE phone = ? ', [member.phone || '__NO_PHONE__']);
    }

    let ctvPhone = userInfo.ctv || '';
    const ctvOwner = await resolveUserByIdentifier(userInfo.ctv || '');
    if (ctvOwner?.phone) {
        ctvPhone = ctvOwner.phone;
    }
    const [telegram_ctv] = await connection.query('SELECT `telegram` FROM point_list WHERE phone = ? ', [ctvPhone || '__NO_PHONE__']);
    const [ng_moi] = await connection.query('SELECT `phone` FROM users WHERE code = ? ', [userInfo.invite]);
    return res.status(200).json({
        message: 'Success',
        status: true,
        datas: [userInfo],
        total_r: recharge,
        total_w: withdraw,
        f1: f1s.length,
        f2: f2,
        f3: f3,
        f4: f4,
        bank_user: bank_user,
        telegram: telegram_ctv[0],
        ng_moi: ng_moi[0],
        daily: userInfo.ctv,
    });
}



const recharge = async (req, res) => {
    let auth = req.cookies.auth;
    if (!auth) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }

    const [recharge] = await connection.query('SELECT * FROM recharge WHERE status = 0 ');
    const [recharge2] = await connection.query('SELECT * FROM recharge WHERE status != 0 ');
    const [withdraw] = await connection.query('SELECT * FROM withdraw WHERE status = 0 ');
    const [withdraw2] = await connection.query('SELECT * FROM withdraw WHERE status != 0 ');
    return res.status(200).json({
        message: 'Success',
        status: true,
        datas: recharge,
        datas2: recharge2,
        datas3: withdraw,
        datas4: withdraw2,
    });
}

const settingGet = async (req, res) => {
    try {
        let auth = req.cookies.auth;
        if (!auth) {
            return res.status(200).json({
                message: 'Failed',
                status: false,
                timeStamp: timeNow,
            });
        }

        const [bank_recharge] = await connection.query("SELECT * FROM bank_recharge");
        const [bank_recharge_momo] = await connection.query("SELECT * FROM bank_recharge WHERE type = 'momo'");
        let settings = [];
        try {
            [settings] = await connection.query('SELECT * FROM admin ');
        } catch (error) {
            if (error?.code !== 'ER_BAD_FIELD_ERROR') {
                throw error;
            }
            [settings] = await connection.query('SELECT *, "Baba Games" AS application_name FROM admin ');
        }

        let bank_recharge_momo_data
        if (bank_recharge_momo.length) {
            bank_recharge_momo_data = bank_recharge_momo[0]
        }
        return res.status(200).json({
            message: 'Success',
            status: true,
            settings: settings,
            datas: bank_recharge,
            momo: {
                bank_name: bank_recharge_momo_data?.name_bank || "",
                username: bank_recharge_momo_data?.name_user || "",
                upi_id: bank_recharge_momo_data?.stk || "",
                usdt_wallet_address: bank_recharge_momo_data?.qr_code_image || "",
            }
        });
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            message: 'Failed',
            status: false,
        });
    }
}

const rechargeDuyet = async (req, res) => {
    let auth = req.cookies.auth;
    let id = req.body.id;
    let type = req.body.type;
    if (!auth || !id || !type) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
    if (type == 'confirm') {
        let connection1 =  await connection.getConnection();
        try {
          await connection1.beginTransaction();
          const [discount] = await connection1.query('select recharge_bonus from discount');
          let { recharge_bonus } = discount[0];
          recharge_bonus = parseInt(recharge_bonus);
          await connection1.query(
            `UPDATE recharge SET status = 1 WHERE id = ?`,
            [id]
          );
          const [info] = await connection1.query(
            `SELECT * FROM recharge WHERE id = ?`,
            [id]
          );
          let [users] = await connection1.query(
            "SELECT `phone`, `code`,`name_user`,`invite` FROM users WHERE `phone` = ? ",
            [info?.[0]?.phone]
          );
          const user = users?.[0];
          if (user === undefined || user === null) {
            throw Error("Unable to get user data!");
          }

          const user_money = parseFloat(info[0].money) + parseFloat((info[0].money / 100) * recharge_bonus);
          console.log("user money ",user_money);
          const inviter_money = (info[0].money / 100) * recharge_bonus;
          await connection1.query(
            "UPDATE users SET money = money + ?, total_money = total_money + ? WHERE `phone` = ?",
            [user_money, user_money, user.phone]
          );

          const [inviter] = await connection1.query(
            "SELECT id,phone,level FROM users WHERE `code` = ?",
            [user.invite]
          );
          console.log("inviter ",inviter);
          if (inviter.length > 0) {
            if(inviter[0].level == 2){
                const [agent] = await connection1.query(
                    "SELECT *  FROM  agent_commission  WHERE user_id = ? ",
                    [inviter[0].id]
                  );
                  console.log("agent ",agent);
                if(agent.length > 0){
                  let commission =  parseFloat((info[0].money / 100) * agent[0].commission);
                  await connection1.query("insert into agent_commission_amount set user_id = ?, recharge_id = ?,money = ?,commission_amount = ?",[inviter[0].id,parseInt(id),parseFloat(info[0].money),commission])
                }
            }
            else{
                await connection1.query(
                    "UPDATE users SET money = money + ?, total_money = total_money + ? WHERE `code` = ? AND `phone` = ?",
                    [inviter_money, inviter_money, user.invite, inviter?.[0].phone]
                  );
                  console.log("SUCCESSFULLY ADD MONEY TO inviter");
            }
           
          }
           runWorker(user.code)
          .then((result) => {
            console.log(result);
          })
          .catch((err) => {
            console.error('Worker error:', err);
          });
          const [invitation] = await connection1.query(
            `select level,phone from invitation_level where code = ?`,
            [user.invite]
          );
          console.log("invitation ", invitation);
          if(invitation.length > 0){
          const { level, phone } = invitation[0];
          if(level<12){
          let { invitationNo, rewardMoney } = invitationBouceList[level];
          console.log("invitation level ", invitationNo);
          const [invitationList] = await connection1.query(
            "SELECT u.phone,u.code ,sum(IFNULL(r.money,0)) as money,r.type FROM users u left JOIN recharge r on u.phone = r.phone where (r.type='upi_manual' or r.type is Null) and (r.status=1 or r.status is Null) and u.invite= ? group by u.phone,u.code,r.type",
            [user.invite]
          );
          let count = 0,
            deposit = 0;
          for (let i of invitationList) {
            count += 1;
            if (i.money >= 500) {
              deposit += 1;
            }
          }
          console.log("count ", count, " deposit ", deposit);
          if (count >= invitationNo && deposit >= invitationNo) {
            let time = new Date().getTime();
            let timeNow = timerJoin(new Date().getTime());
            let id_order =
              Math.floor(
                Math.random() * (99999999999999 - 10000000000000 + 1)
              ) + 10000000000000;
            const sql_recharge =
              "INSERT INTO recharge (id_order, transaction_id, phone, money, type, status, today, url, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
            await connection1.execute(sql_recharge, [
              id_order,
              0,
              phone,
              rewardMoney,
              "Invitation Bonus",
              1,
              timeNow,
              0,
              time,
            ]);
            await connection1.query(
              "UPDATE users SET money = money + ?, total_money = total_money + ? WHERE `code` = ? AND `phone` = ?",
              [rewardMoney, rewardMoney, user.invite, phone]
            );
            console.log("transfer invite amount");
            await connection1.query(
              `Update invitation_level set level = ? where code = ?`,
              [invitation[0].level + 1, user.invite]
            );
            await connection1.commit();
            return res.status(200).json({
                message: "Successful application confirmation",
                status: true,
                datas: recharge,
              });
          } else {
            await connection1.commit();
            return res.status(200).json({
                message: "Successful application confirmation",
                status: true,
                datas: recharge,
              });
          }
        }
        else{
            await connection1.commit();
            return res.status(200).json({
                message: "Successful application confirmation",
                status: true,
                datas: recharge,
              });
        }
       }
       else{
        await connection1.commit();
        return res.status(200).json({
            message: "Successful application confirmation",
            status: true,
            datas: recharge,
          });
       }
        } catch (err) {
          console.log("err ", err);
          await connection1.rollback();
          sendStatus(res, "Something went wrong!");
        }
    }
    if (type == 'delete') {
        await connection.query(`UPDATE recharge SET status = 2 WHERE id = ?`, [id]);

        return res.status(200).json({
            message: 'Cancellation successful',
            status: true,
            datas: recharge,
        });
    }
}

const getUserDataByPhone = async (phone) => {
    let [users] = await connection.query('SELECT `phone`, `code`,`name_user`,`invite` FROM users WHERE `phone` = ? ', [phone]);
    const user = users?.[0]


    if (user === undefined || user === null) {
        throw Error("Unable to get user data!")
    }

    return {
        phone: user.phone,
        code: user.code,
        username: user.name_user,
        invite: user.invite,
    }
}


const addUserAccountBalance = async ({ money, phone, invite }) => {
    const user_money = money + (money / 100) * 5
    const inviter_money = (money / 100) * 5

    await connection.query('UPDATE users SET money = money + ?, total_money = total_money + ? WHERE `phone` = ?', [user_money, user_money, phone]);

    const [inviter] = await connection.query('SELECT phone FROM users WHERE `code` = ?', [invite]);

    if (inviter.length) {
        console.log(inviter)
        console.log(inviter_money, inviter_money, invite, inviter?.[0].phone)
        await connection.query('UPDATE users SET money = money + ?, total_money = total_money + ? WHERE `code` = ? AND `phone` = ?', [inviter_money, inviter_money, invite, inviter?.[0].phone]);
        console.log("SUCCESSFULLY ADD MONEY TO inviter")
    }
}

const updateLevel = async (req, res) => {
    try {
        let id = req.body.id;
        let f1 = req.body.f1;
        let f2 = req.body.f2;
        let f3 = req.body.f3;
        let f4 = req.body.f4;

        console.log("level : " + id, f1, f2, f3, f4);

        await connection.query(
            'UPDATE `level` SET `f1`= ? ,`f2`= ? ,`f3`= ? ,`f4`= ?  WHERE `id` = ?',
            [f1, f2, f3, f4, id]
        );

        // Send a success response to the client
        res.status(200).json({
            message: 'Update successful',
            status: true,
        });
    } catch (error) {
        console.error('Error updating level:', error);

        // Send an error response to the client
        res.status(500).json({
            message: 'Update failed',
            status: false,
            error: error.message,
        });
    }
};


const handlWithdraw = async (req, res) => {
    let auth = req.cookies.auth;
    let id = req.body.id;
    let type = req.body.type;
    if (!auth || !id || !type) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
    if (type == 'confirm') {
        await connection.query(`UPDATE withdraw SET status = 1 WHERE id = ?`, [id]);
        const [info] = await connection.query(`SELECT * FROM withdraw WHERE id = ?`, [id]);
        return res.status(200).json({
            message: 'Successful application confirmation',
            status: true,
            datas: recharge,
        });
    }
    if (type == 'delete') {
        await connection.query(`UPDATE withdraw SET status = 2 WHERE id = ?`, [id]);
        const [info] = await connection.query(`SELECT * FROM withdraw WHERE id = ?`, [id]);
        await connection.query('UPDATE users SET money = money + ? WHERE phone = ? ', [info[0].money, info[0].phone]);
        return res.status(200).json({
            message: 'Cancel successfully',
            status: true,
            datas: recharge,
        });
    }
}

const settingBank = async (req, res) => {
    try {


        let auth = req.cookies.auth;
        let name_bank = req.body.name_bank;
        let name = req.body.name;
        let info = req.body.info;
        let qr = req.body.qr;
        let typer = req.body.typer;

        if (!auth || !typer) {
            return res.status(200).json({
                message: 'Failed',
                status: false,
                timeStamp: timeNow,
            });
        }
        if (typer == 'bank') {
            await connection.query(`UPDATE bank_recharge SET name_bank = ?, name_user = ?, stk = ? WHERE type = 'bank'`, [name_bank, name, info]);
            return res.status(200).json({
                message: 'Successful change',
                status: true,
                datas: recharge,
            });
        }

        if (typer == 'momo') {
            const [bank_recharge] = await connection.query(`SELECT * FROM bank_recharge WHERE type = 'momo'`);

            const deleteRechargeQueries = bank_recharge.map(recharge => {
                return deleteBankRechargeById(recharge.id)
            });

            await Promise.all(deleteRechargeQueries)

            // await connection.query(`UPDATE bank_recharge SET name_bank = ?, name_user = ?, stk = ?, qr_code_image = ? WHERE type = 'upi'`, [name_bank, name, info, qr]);

            const bankName = req.body.bank_name
            const username = req.body.username
            const upiId = req.body.upi_id
            const usdtWalletAddress = req.body.usdt_wallet_address

            await connection.query("INSERT INTO bank_recharge SET name_bank = ?, name_user = ?, stk = ?, qr_code_image = ?, type = 'momo'", [
                bankName, username, upiId, usdtWalletAddress
            ])

            return res.status(200).json({
                message: 'Successfully changed',
                status: true,
                datas: recharge,
            });
        }
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            message: 'Something went wrong!',
            status: false,
        });
    }
}

const deleteBankRechargeById = async (id) => {
    const [recharge] = await connection.query("DELETE FROM bank_recharge WHERE type = 'momo' AND id = ?", [id]);

    return recharge
}

const settingCskh = async (req, res) => {
    let auth = req.cookies.auth;
    let telegram = req.body.telegram;
    let cskh = req.body.cskh;
    let myapp_web = req.body.myapp_web;
    let application_name = req.body.application_name;
    if (!auth || !cskh || !telegram) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
    const normalizedAppName = String(application_name || DEFAULT_APPLICATION_NAME).trim().slice(0, 120) || DEFAULT_APPLICATION_NAME;
    try {
        await connection.query(`UPDATE admin SET telegram = ?, cskh = ?, app = ?, application_name = ?`, [telegram, cskh, myapp_web, normalizedAppName]);
    } catch (error) {
        if (error?.code !== 'ER_BAD_FIELD_ERROR') {
            throw error;
        }
        await connection.query(`UPDATE admin SET telegram = ?, cskh = ?, app = ?`, [telegram, cskh, myapp_web]);
    }
    invalidateSiteSettingsCache();
    return res.status(200).json({
        message: 'Successful change',
        status: true,
    });
}

const banned = async (req, res) => {
    let auth = req.cookies.auth;
    let id = req.body.id;
    let type = req.body.type;
    if (!auth || !id) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
    if (type == 'open') {
        await connection.query(`UPDATE users SET status = 1 WHERE id = ?`, [id]);
    }
    if (type == 'close') {
        await connection.query(`UPDATE users SET status = 2 WHERE id = ?`, [id]);
    }
    return res.status(200).json({
        message: 'Successful change',
        status: true,
    });
}

const deleteMember = async (req, res) => {
    const auth = req.cookies.auth;
    const id = Number(req.body?.id);

    if (!auth || !Number.isInteger(id) || id <= 0) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }

    let connection1;
    try {
        const [authUserRows] = await connection.query('SELECT id, level FROM users WHERE token = ? LIMIT 1', [auth]);
        const authUser = authUserRows?.[0];

        if (!authUser || Number(authUser.level) !== 1) {
            return res.status(200).json({
                message: 'Failed',
                status: false,
                timeStamp: timeNow,
            });
        }

        connection1 = await connection.getConnection();
        await connection1.beginTransaction();

        const [targetRows] = await connection1.query(
            'SELECT id, id_user, phone, email, level FROM users WHERE id = ? LIMIT 1',
            [id]
        );
        const targetUser = targetRows?.[0];

        if (!targetUser) {
            await connection1.rollback();
            return res.status(200).json({
                message: 'User not found',
                status: false,
            });
        }

        if (Number(targetUser.level) === 1) {
            await connection1.rollback();
            return res.status(200).json({
                message: 'Admin account cannot be deleted',
                status: false,
            });
        }

        if (Number(targetUser.id) === Number(authUser.id)) {
            await connection1.rollback();
            return res.status(200).json({
                message: 'You cannot delete your own account',
                status: false,
            });
        }

        const dbName = await getCurrentDatabaseName(connection1);
        await deleteUserRowsByForeignKeys(connection1, dbName, targetUser);
        await deleteUserRowsBySchemaColumns(connection1, dbName, targetUser);

        await connection1.query('DELETE FROM users WHERE id = ? LIMIT 1', [id]);

        await connection1.commit();
        return res.status(200).json({
            message: 'User deleted successfully',
            status: true,
        });
    } catch (error) {
        if (connection1) {
            await connection1.rollback();
        }
        console.log('deleteMember error', error);
        return res.status(500).json({
            message: 'Failed to delete user',
            status: false,
        });
    } finally {
        if (connection1) {
            connection1.release();
        }
    }
}


const createBonus = async (req, res) => {
    const randomString = (length) => {
        var result = '';
        var characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        var charactersLength = characters.length;
        for (var i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() *
                charactersLength));
        }
        return result;
    }
    function timerJoin(params = '', addHours = 0) {
        let date = '';
        if (params) {
            date = new Date(Number(params));
        } else {
            date = new Date();
        }

        date.setHours(date.getHours() + addHours);

        let years = formateT(date.getFullYear());
        let months = formateT(date.getMonth() + 1);
        let days = formateT(date.getDate());

        let hours = date.getHours() % 12;
        hours = hours === 0 ? 12 : hours;
        let ampm = date.getHours() < 12 ? "AM" : "PM";

        let minutes = formateT(date.getMinutes());
        let seconds = formateT(date.getSeconds());

        return years + '-' + months + '-' + days + ' ' + hours + ':' + minutes + ':' + seconds + ' ' + ampm;
    }
    const d = new Date();
    const time = d.getTime();

    let auth = req.cookies.auth;
    let money = req.body.money;
    let type = req.body.type;
    const { numberOfUsers } = req.body;


    if (!money || !auth) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
    const [user] = await connection.query('SELECT * FROM users WHERE token = ? ', [auth]);

    if (user.length == 0) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
    let userInfo = user[0];

    if (type == 'all') {
        let select = req.body.select;
        if (select == '1') {
            await connection.query(`UPDATE point_list SET money = money + ? WHERE level = 2`, [money]);
        } else {
            await connection.query(`UPDATE point_list SET money = money - ? WHERE level = 2`, [money]);
        }
        return res.status(200).json({
            message: 'successful change',
            status: true,
        });
    }

    if (type == 'two') {
        let select = req.body.select;
        if (select == '1') {
            await connection.query(`UPDATE point_list SET money_us = money_us + ? WHERE level = 2`, [money]);
        } else {
            await connection.query(`UPDATE point_list SET money_us = money_us - ? WHERE level = 2`, [money]);
        }
        return res.status(200).json({
            message: 'successful change',
            status: true,
        });
    }

    if (type == 'one') {
        let select = req.body.select;
        let phone = req.body.phone;
        const [user] = await connection.query('SELECT * FROM point_list WHERE phone = ? ', [phone]);
        if (user.length == 0) {
            return res.status(200).json({
                message: 'Failed',
                status: false,
                timeStamp: timeNow,
            });
        }
        if (select == '1') {
            await connection.query(`UPDATE point_list SET money = money + ? WHERE level = 2 and phone = ?`, [money, phone]);
        } else {
            await connection.query(`UPDATE point_list SET money = money - ? WHERE level = 2 and phone = ?`, [money, phone]);
        }
        return res.status(200).json({
            message: 'successful change',
            status: true,
        });
    }

    if (type == 'three') {
        let select = req.body.select;
        let phone = req.body.phone;
        const [user] = await connection.query('SELECT * FROM point_list WHERE phone = ? ', [phone]);
        if (user.length == 0) {
            return res.status(200).json({
                message: 'account does not exist',
                status: false,
                timeStamp: timeNow,
            });
        }
        if (select == '1') {
            await connection.query(`UPDATE point_list SET money_us = money_us + ? WHERE level = 2 and phone = ?`, [money, phone]);
        } else {
            await connection.query(`UPDATE point_list SET money_us = money_us - ? WHERE level = 2 and phone = ?`, [money, phone]);
        }
        return res.status(200).json({
            message: 'successful change',
            status: true,
        });
    }

    if (!type) {
        let id_redenvelops = randomString(16);
        let sql = `INSERT INTO redenvelopes SET id_redenvelope = ?, phone = ?, money = ?, used = ?, amount = ?, status = ?, time = ?`;
        await connection.query(sql, [id_redenvelops, userInfo.phone, money,numberOfUsers, 1, 0, time]);
        return res.status(200).json({
            message: 'Successful change',
            status: true,
            id: id_redenvelops,
        });
    }
}

const listRedenvelops = async (req, res) => {
    let auth = req.cookies.auth;

    let [redenvelopes] = await connection.query('SELECT * FROM redenvelopes WHERE status = 0  order by time desc ');
    return res.status(200).json({
        message: 'Successful change',
        status: true,
        redenvelopes: redenvelopes,
    });
}

const settingbuff = async (req, res) => {
    let auth = req.cookies.auth;
    let id_user = req.body.id_user;
    let buff_acc = req.body.buff_acc;
    let money_value = req.body.money_value;
    if (!id_user || !buff_acc || !money_value) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
    const [user_id] = await connection.query(`SELECT * FROM users WHERE id_user = ?`, [id_user]);

    if (user_id.length > 0) {
        if (buff_acc == '1') {
            await connection.query(`UPDATE users SET money = money + ? WHERE id_user = ?`, [money_value, id_user]);
        }
        if (buff_acc == '2') {
            await connection.query(`UPDATE users SET money = money - ? WHERE id_user = ?`, [money_value, id_user]);
        }
        return res.status(200).json({
            message: 'Successful change',
            status: true,
        });
    } else {
        return res.status(200).json({
            message: 'Successful change',
            status: false,
        });
    }
}
const randomNumber = (min, max) => {
    return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

const randomString = (length) => {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() *
            charactersLength));
    }
    return result;
}

const ipAddress = (req) => {
    let ip = '';
    if (req.headers['x-forwarded-for']) {
        ip = req.headers['x-forwarded-for'].split(",")[0];
    } else if (req.connection && req.connection.remoteAddress) {
        ip = req.connection.remoteAddress;
    } else {
        ip = req.ip;
    }
    return ip;
}

const timeCreate = () => {
    const d = new Date();
    const time = d.getTime();
    return time;
}



const register = async (req, res) => {
    let { username, password, invitecode } = req.body;
    let id_user = randomNumber(10000, 99999);
    let name_user = "Member" + randomNumber(10000, 99999);
    let code = randomString(5) + randomNumber(10000, 99999);
    let ip = ipAddress(req);
    let time = timeCreate();

    invitecode = 'RZRAU36460';

    if (!username || !password || !invitecode) {
        return res.status(200).json({
            message: 'ERROR!!!',
            status: false
        });
    }

    if (!username) {
        return res.status(200).json({
            message: 'phone error',
            status: false
        });
    }

    try {
        const [check_u] = await connection.query('SELECT * FROM users WHERE phone = ? ', [username]);
        if (check_u.length == 1) {
            return res.status(200).json({
                message: 'register account', //Số điện thoại đã được đăng ký
                status: false
            });
        } else {
            const sql = `INSERT INTO users SET 
            id_user = ?,
            phone = ?,
            name_user = ?,
            password = ?,
            money = ?,
            level = ?,
            code = ?,
            invite = ?,
            veri = ?,
            ip_address = ?,
            status = ?,
            time = ?`;
            await connection.execute(sql, [id_user, username, name_user, md5(password), 0, 2, code, invitecode, 1, ip, 1, time]);
            await connection.execute('INSERT INTO point_list SET phone = ?, level = 2', [username]);
            const [user] = await connection.query('select * from users where phone = ? limit 1',[username]);
            console.log("user ",user);
            if(user.length > 0){
                await connection.execute(`INSERT INTO invitation_level SET  user_id = ?, phone = ?, code = ? `,[user[0].id,username,code]);
            }
            return res.status(200).json({
                message: 'registration success',//Register Sucess
                status: true
            });
        }
    } catch (error) {
        if (error) console.log(error);
    }

}

const profileUser = async (req, res) => {
    let identifier = getMemberIdentifier(req);
    if (!identifier) {
        return res.status(200).json({
            message: 'Phone Error',
            status: false,
            timeStamp: timeNow,
        });
    }
    let user = await resolveUserByIdentifier(identifier);

    if (!user) {
        return res.status(200).json({
            message: 'Phone Error',
            status: false,
            timeStamp: timeNow,
        });
    }
    const ownership = buildOwnershipWhereClause(user, 'user_id', 'phone');
    let [recharge] = await connection.query(`SELECT * FROM recharge WHERE ${ownership.clause} ORDER BY id DESC LIMIT 10`, ownership.params);
    let [withdraw] = await connection.query(`SELECT * FROM withdraw WHERE ${ownership.clause} ORDER BY id DESC LIMIT 10`, ownership.params);
    return res.status(200).json({
        message: 'Get success',
        status: true,
        recharge: recharge,
        withdraw: withdraw,
    });
}

const infoCtv = async (req, res) => {
    const identifier = getMemberIdentifier(req);
    const ctvUser = await resolveUserByIdentifier(identifier);

    if (!ctvUser) {
        return res.status(200).json({
            message: 'Phone Error',
            status: false,
        });
    }
    let userInfo = ctvUser;
    const ctvPhone = userInfo.phone || '__NO_PHONE__';
    const managerScope = buildCtvScope(userInfo);
    // cấp dưới trực tiếp all
    const [f1s] = await connection.query('SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ', [userInfo.code]);

    // cấp dưới trực tiếp hôm nay 
    let f1_today = 0;
    for (let i = 0; i < f1s.length; i++) {
        const f1_time = f1s[i].time; // Mã giới thiệu f1
        let check = (timerJoin(f1_time) == timerJoin()) ? true : false;
        if (check) {
            f1_today += 1;
        }
    }

    // tất cả cấp dưới hôm nay 
    let f_all_today = 0;
    for (let i = 0; i < f1s.length; i++) {
        const f1_code = f1s[i].code; // Mã giới thiệu f1
        const f1_time = f1s[i].time; // time f1
        let check_f1 = (timerJoin(f1_time) == timerJoin()) ? true : false;
        if (check_f1) f_all_today += 1;
        // tổng f1 mời đc hôm nay
        const [f2s] = await connection.query('SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ', [f1_code]);
        for (let i = 0; i < f2s.length; i++) {
            const f2_code = f2s[i].code; // Mã giới thiệu f2
            const f2_time = f2s[i].time; // time f2
            let check_f2 = (timerJoin(f2_time) == timerJoin()) ? true : false;
            if (check_f2) f_all_today += 1;
            // tổng f2 mời đc hôm nay
            const [f3s] = await connection.query('SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ', [f2_code]);
            for (let i = 0; i < f3s.length; i++) {
                const f3_code = f3s[i].code; // Mã giới thiệu f3
                const f3_time = f3s[i].time; // time f3
                let check_f3 = (timerJoin(f3_time) == timerJoin()) ? true : false;
                if (check_f3) f_all_today += 1;
                const [f4s] = await connection.query('SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ', [f3_code]);
                // tổng f3 mời đc hôm nay
                for (let i = 0; i < f4s.length; i++) {
                    const f4_code = f4s[i].code; // Mã giới thiệu f4
                    const f4_time = f4s[i].time; // time f4
                    let check_f4 = (timerJoin(f4_time) == timerJoin()) ? true : false;
                    if (check_f4) f_all_today += 1;
                    // tổng f3 mời đc hôm nay
                }
            }
        }
    }

    // Tổng số f2
    let f2 = 0;
    for (let i = 0; i < f1s.length; i++) {
        const f1_code = f1s[i].code; // Mã giới thiệu f1
        const [f2s] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ', [f1_code]);
        f2 += f2s.length;
    }

    // Tổng số f3
    let f3 = 0;
    for (let i = 0; i < f1s.length; i++) {
        const f1_code = f1s[i].code; // Mã giới thiệu f1
        const [f2s] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ', [f1_code]);
        for (let i = 0; i < f2s.length; i++) {
            const f2_code = f2s[i].code;
            const [f3s] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ', [f2_code]);
            if (f3s.length > 0) f3 += f3s.length;
        }
    }

    // Tổng số f4
    let f4 = 0;
    for (let i = 0; i < f1s.length; i++) {
        const f1_code = f1s[i].code; // Mã giới thiệu f1
        const [f2s] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ', [f1_code]);
        for (let i = 0; i < f2s.length; i++) {
            const f2_code = f2s[i].code;
            const [f3s] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ', [f2_code]);
            for (let i = 0; i < f3s.length; i++) {
                const f3_code = f3s[i].code;
                const [f4s] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ', [f3_code]);
                if (f4s.length > 0) f4 += f4s.length;
            }
        }
    }

    const [list_mem] = await connection.query(`SELECT * FROM users WHERE ${managerScope.clause} AND status = 1 AND veri = 1 `, managerScope.params);
    const [list_mem_baned] = await connection.query(`SELECT * FROM users WHERE ${managerScope.clause} AND status = 2 AND veri = 1 `, managerScope.params);
    let total_recharge = 0;
    let total_withdraw = 0;
    for (let i = 0; i < list_mem.length; i++) {
        let phone = list_mem[i].phone;
        const [recharge] = await connection.query('SELECT SUM(money) as money FROM recharge WHERE phone = ? AND status = 1 ', [phone]);
        const [withdraw] = await connection.query('SELECT SUM(money) as money FROM withdraw WHERE phone = ? AND status = 1 ', [phone]);
        if (recharge[0].money) {
            total_recharge += Number(recharge[0].money);
        }
        if (withdraw[0].money) {
            total_withdraw += Number(withdraw[0].money);
        }
    }

    let total_recharge_today = 0;
    let total_withdraw_today = 0;
    for (let i = 0; i < list_mem.length; i++) {
        let phone = list_mem[i].phone;
        const [recharge_today] = await connection.query('SELECT `money`, `time` FROM recharge WHERE phone = ? AND status = 1 ', [phone]);
        const [withdraw_today] = await connection.query('SELECT `money`, `time` FROM withdraw WHERE phone = ? AND status = 1 ', [phone]);
        for (let i = 0; i < recharge_today.length; i++) {
            let today = timerJoin();
            let time = timerJoin(recharge_today[i].time);
            if (time == today) {
                total_recharge_today += recharge_today[i].money;
            }
        }
        for (let i = 0; i < withdraw_today.length; i++) {
            let today = timerJoin();
            let time = timerJoin(withdraw_today[i].time);
            if (time == today) {
                total_withdraw_today += withdraw_today[i].money;
            }
        }
    }

    let win = 0;
    let loss = 0;
    for (let i = 0; i < list_mem.length; i++) {
        let phone = list_mem[i].phone;
        const [wins] = await connection.query('SELECT `money`, `time` FROM minutes_1 WHERE phone = ? AND status = 1 ', [phone]);
        const [losses] = await connection.query('SELECT `money`, `time` FROM minutes_1 WHERE phone = ? AND status = 2 ', [phone]);
        for (let i = 0; i < wins.length; i++) {
            let today = timerJoin();
            let time = timerJoin(wins[i].time);
            if (time == today) {
                win += wins[i].money;
            }
        }
        for (let i = 0; i < losses.length; i++) {
            let today = timerJoin();
            let time = timerJoin(losses[i].time);
            if (time == today) {
                loss += losses[i].money;
            }
        }
    }
    let list_mems = [];
    const [list_mem_today] = await connection.query(`SELECT * FROM users WHERE ${managerScope.clause} AND status = 1 AND veri = 1 `, managerScope.params);
    for (let i = 0; i < list_mem_today.length; i++) {
        let today = timerJoin();
        let time = timerJoin(list_mem_today[i].time);
        if (time == today) {
            list_mems.push(list_mem_today[i]);
        }
    }

    const [point_list] = await connection.query('SELECT * FROM point_list WHERE phone = ? ', [ctvPhone]);
    let moneyCTV = point_list[0].money;

    let list_recharge_news = [];
    let list_withdraw_news = [];
    for (let i = 0; i < list_mem.length; i++) {
        let phone = list_mem[i].phone;
        const [recharge_today] = await connection.query('SELECT `id`, `status`, `type`,`phone`, `money`, `time` FROM recharge WHERE phone = ? AND status = 1 ', [phone]);
        const [withdraw_today] = await connection.query('SELECT `id`, `status`,`phone`, `money`, `time` FROM withdraw WHERE phone = ? AND status = 1 ', [phone]);
        for (let i = 0; i < recharge_today.length; i++) {
            let today = timerJoin();
            let time = timerJoin(recharge_today[i].time);
            if (time == today) {
                list_recharge_news.push(recharge_today[i]);
            }
        }
        for (let i = 0; i < withdraw_today.length; i++) {
            let today = timerJoin();
            let time = timerJoin(withdraw_today[i].time);
            if (time == today) {
                list_withdraw_news.push(withdraw_today[i]);
            }
        }
    }

    const [redenvelopes_used] = await connection.query('SELECT * FROM redenvelopes_used WHERE phone = ? ', [ctvPhone]);
    let redenvelopes_used_today = [];
    for (let i = 0; i < redenvelopes_used.length; i++) {
        let today = timerJoin();
        let time = timerJoin(redenvelopes_used[i].time);
        if (time == today) {
            redenvelopes_used_today.push(redenvelopes_used[i]);
        }
    }

    const [financial_details] = await connection.query('SELECT * FROM financial_details WHERE phone = ? ', [ctvPhone]);
    let financial_details_today = [];
    for (let i = 0; i < financial_details.length; i++) {
        let today = timerJoin();
        let time = timerJoin(financial_details[i].time);
        if (time == today) {
            financial_details_today.push(financial_details[i]);
        }
    }


    return res.status(200).json({
        message: 'Success',
        status: true,
        datas: [userInfo],
        f1: f1s.length,
        f2: f2,
        f3: f3,
        f4: f4,
        list_mems: list_mems,
        total_recharge: total_recharge,
        total_withdraw: total_withdraw,
        total_recharge_today: total_recharge_today,
        total_withdraw_today: total_withdraw_today,
        list_mem_baned: list_mem_baned.length,
        win: win,
        loss: loss,
        list_recharge_news: list_recharge_news,
        list_withdraw_news: list_withdraw_news,
        moneyCTV: moneyCTV,
        redenvelopes_used: redenvelopes_used_today,
        financial_details_today: financial_details_today,
    });
}

const infoCtv2 = async (req, res) => {
    const identifier = getMemberIdentifier(req);
    const timeDate = req.body.timeDate;

    function timerJoin(params = '', addHours = 0) {
        let date = '';
        if (params) {
            date = new Date(Number(params));
        } else {
            date = new Date();
        }

        date.setHours(date.getHours() + addHours);

        let years = formateT(date.getFullYear());
        let months = formateT(date.getMonth() + 1);
        let days = formateT(date.getDate());

        let hours = date.getHours() % 12;
        hours = hours === 0 ? 12 : hours;
        let ampm = date.getHours() < 12 ? "AM" : "PM";

        let minutes = formateT(date.getMinutes());
        let seconds = formateT(date.getSeconds());

        return years + '-' + months + '-' + days + ' ' + hours + ':' + minutes + ':' + seconds + ' ' + ampm;
    }

    const ctvUser = await resolveUserByIdentifier(identifier);
    if (!ctvUser) {
        return res.status(200).json({
            message: 'Phone Error',
            status: false,
        });
    }
    let userInfo = ctvUser;
    const ctvPhone = userInfo.phone || '__NO_PHONE__';
    const managerScope = buildCtvScope(userInfo);
    const [list_mem] = await connection.query(`SELECT * FROM users WHERE ${managerScope.clause} AND status = 1 AND veri = 1 `, managerScope.params);

    let list_mems = [];
    const [list_mem_today] = await connection.query(`SELECT * FROM users WHERE ${managerScope.clause} AND status = 1 AND veri = 1 `, managerScope.params);
    for (let i = 0; i < list_mem_today.length; i++) {
        let today = timeDate;
        let time = timerJoin(list_mem_today[i].time);
        if (time == today) {
            list_mems.push(list_mem_today[i]);
        }
    }

    let list_recharge_news = [];
    let list_withdraw_news = [];
    for (let i = 0; i < list_mem.length; i++) {
        let phone = list_mem[i].phone;
        const [recharge_today] = await connection.query('SELECT `id`, `status`, `type`,`phone`, `money`, `time` FROM recharge WHERE phone = ? AND status = 1 ', [phone]);
        const [withdraw_today] = await connection.query('SELECT `id`, `status`,`phone`, `money`, `time` FROM withdraw WHERE phone = ? AND status = 1 ', [phone]);
        for (let i = 0; i < recharge_today.length; i++) {
            let today = timeDate;
            let time = timerJoin(recharge_today[i].time);
            if (time == today) {
                list_recharge_news.push(recharge_today[i]);
            }
        }
        for (let i = 0; i < withdraw_today.length; i++) {
            let today = timeDate;
            let time = timerJoin(withdraw_today[i].time);
            if (time == today) {
                list_withdraw_news.push(withdraw_today[i]);
            }
        }
    }

    const [redenvelopes_used] = await connection.query('SELECT * FROM redenvelopes_used WHERE phone = ? ', [ctvPhone]);
    let redenvelopes_used_today = [];
    for (let i = 0; i < redenvelopes_used.length; i++) {
        let today = timeDate;
        let time = timerJoin(redenvelopes_used[i].time);
        if (time == today) {
            redenvelopes_used_today.push(redenvelopes_used[i]);
        }
    }

    const [financial_details] = await connection.query('SELECT * FROM financial_details WHERE phone = ? ', [ctvPhone]);
    let financial_details_today = [];
    for (let i = 0; i < financial_details.length; i++) {
        let today = timeDate;
        let time = timerJoin(financial_details[i].time);
        if (time == today) {
            financial_details_today.push(financial_details[i]);
        }
    }

    return res.status(200).json({
        message: 'Success',
        status: true,
        datas: [userInfo],
        list_mems: list_mems,
        list_recharge_news: list_recharge_news,
        list_withdraw_news: list_withdraw_news,
        redenvelopes_used: redenvelopes_used_today,
        financial_details_today: financial_details_today,
    });
}

const listRechargeMem = async (req, res) => {
    let auth = req.cookies.auth;
    let identifier = getMemberIdentifier(req);
    let { pageno, limit } = req.body;

    if (!pageno || !limit) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                gameslist: [],
            },
            status: false
        });
    }

    if (pageno < 0 || limit < 0) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                gameslist: [],
            },
            status: false
        });
    }

    if (!identifier) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }

    const member = await resolveUserByIdentifier(identifier);
    const [auths] = await connection.query('SELECT * FROM users WHERE token = ? ', [auth]);

    if (!member || auths.length == 0) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
    const ownership = buildOwnershipWhereClause(member, 'user_id', 'phone');
    const [recharge] = await connection.query(`SELECT * FROM recharge WHERE ${ownership.clause} ORDER BY id DESC LIMIT ${pageno}, ${limit}`, ownership.params);
    const [total_rows] = await connection.query(`SELECT COUNT(1) AS total FROM recharge WHERE ${ownership.clause}`, ownership.params);
    return res.status(200).json({
        message: 'Success',
        status: true,
        datas: recharge,
        page_total: Math.ceil((total_rows[0]?.total || 0) / limit)
    });
}

const listWithdrawMem = async (req, res) => {
    let auth = req.cookies.auth;
    let identifier = getMemberIdentifier(req);
    let { pageno, limit } = req.body;

    if (!pageno || !limit) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                gameslist: [],
            },
            status: false
        });
    }

    if (pageno < 0 || limit < 0) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                gameslist: [],
            },
            status: false
        });
    }

    if (!identifier) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }

    const member = await resolveUserByIdentifier(identifier);
    const [auths] = await connection.query('SELECT * FROM users WHERE token = ? ', [auth]);

    if (!member || auths.length == 0) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
    const ownership = buildOwnershipWhereClause(member, 'user_id', 'phone');
    const [withdraw] = await connection.query(`SELECT * FROM withdraw WHERE ${ownership.clause} ORDER BY id DESC LIMIT ${pageno}, ${limit}`, ownership.params);
    const [total_rows] = await connection.query(`SELECT COUNT(1) AS total FROM withdraw WHERE ${ownership.clause}`, ownership.params);
    return res.status(200).json({
        message: 'Success',
        status: true,
        datas: withdraw,
        page_total: Math.ceil((total_rows[0]?.total || 0) / limit)
    });
}

const listRedenvelope = async (req, res) => {
    let auth = req.cookies.auth;
    let identifier = getMemberIdentifier(req);
    let { pageno, limit } = req.body;

    if (!pageno || !limit) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                gameslist: [],
            },
            status: false
        });
    }

    if (pageno < 0 || limit < 0) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                gameslist: [],
            },
            status: false
        });
    }

    if (!identifier) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }

    const member = await resolveUserByIdentifier(identifier);
    const [auths] = await connection.query('SELECT * FROM users WHERE token = ? ', [auth]);

    if (!member || auths.length == 0) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
    const { rows: redenvelopes_used, total } = await loadMemberRedenvelopeUsage(member, pageno, limit);
    return res.status(200).json({
        message: 'Success',
        status: true,
        datas: redenvelopes_used,
        page_total: Math.ceil(total / limit)
    });
}
// Level Setting get

const getLevelInfo = async (req, res) => {

    const [rows] = await connection.query('SELECT * FROM `level`');

    if (!rows) {
        return res.status(200).json({
            message: 'Failed',
            status: false,

        });
    }
    console.log("asdasdasd : " + rows)
    return res.status(200).json({
        message: 'Success',
        status: true,
        data: {

        },
        rows: rows
    });

    // const [recharge] = await connection.query('SELECT * FROM recharge WHERE `phone` = ? AND status = 1', [rows[0].phone]);
    // let totalRecharge = 0;
    // recharge.forEach((data) => {
    //     totalRecharge += data.money;
    // });
    // const [withdraw] = await connection.query('SELECT * FROM withdraw WHERE `phone` = ? AND status = 1', [rows[0].phone]);
    // let totalWithdraw = 0;
    // withdraw.forEach((data) => {
    //     totalWithdraw += data.money;
    // });

    // const { id, password, ip, veri, ip_address, status, time, token, ...others } = rows[0];
    // return res.status(200).json({
    //     message: 'Success',
    //     status: true,
    //     data: {
    //         code: others.code,
    //         id_user: others.id_user,
    //         name_user: others.name_user,
    //         phone_user: others.phone,
    //         money_user: others.money,
    //     },
    //     totalRecharge: totalRecharge,
    //     totalWithdraw: totalWithdraw,
    //     timeStamp: timeNow,
    // });


}

const listBet = async (req, res) => {
    let auth = req.cookies.auth;
    let identifier = getMemberIdentifier(req);
    let { pageno, limit } = req.body;

    if (!pageno || !limit) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                gameslist: [],
            },
            status: false
        });
    }

    if (pageno < 0 || limit < 0) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                gameslist: [],
            },
            status: false
        });
    }

    if (!identifier) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }

    const member = await resolveUserByIdentifier(identifier);
    const [auths] = await connection.query('SELECT * FROM users WHERE token = ? ', [auth]);

    if (!member || auths.length == 0) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
    const ownership = buildOwnershipWhereClause(member, 'user_id', 'phone');
    const [listBet] = await connection.query(`SELECT * FROM minutes_1 WHERE ${ownership.clause} AND status != 0 ORDER BY id DESC LIMIT ${pageno}, ${limit}`, ownership.params);
    const [total_rows] = await connection.query(`SELECT COUNT(1) AS total FROM minutes_1 WHERE ${ownership.clause} AND status != 0`, ownership.params);
    return res.status(200).json({
        message: 'Success',
        status: true,
        datas: listBet,
        page_total: Math.ceil((total_rows[0]?.total || 0) / limit)
    });
}

const listOrderOld = async (req, res) => {
    let { gameJoin } = req.body;

    let checkGame = ['1', '3', '5', '10'].includes(String(gameJoin));
    if (!checkGame) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                gameslist: [],
            },
            status: false
        });
    }
    let game = Number(gameJoin);

    let join = '';
    if (game == 1) join = 'k5d';
    if (game == 3) join = 'k5d3';
    if (game == 5) join = 'k5d5';
    if (game == 10) join = 'k5d10';

    const [k5d] = await connection.query(`SELECT * FROM 5d WHERE status != 0 AND game = '${game}' ORDER BY id DESC LIMIT 10 `);
    const [period] = await connection.query(`SELECT period FROM 5d WHERE status = 0 AND game = '${game}' ORDER BY id DESC LIMIT 1 `);
    const [waiting] = await connection.query(`SELECT phone, money, price, amount, bet FROM result_5d WHERE status = 0 AND level = 0 AND game = '${game}' ORDER BY id ASC `);
    const [settings] = await connection.query(`SELECT ${join} FROM admin`);
    if (k5d.length == 0) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                gameslist: [],
            },
            status: false
        });
    }
    if (!k5d[0] || !period[0]) {
        return res.status(200).json({
            message: 'Error!',
            status: false
        });
    }
    return res.status(200).json({
        code: 0,
        msg: "Get success",
        data: {
            gameslist: k5d,
        },
        bet: waiting,
        settings: settings,
        join: join,
        period: period[0].period,
        status: true
    });
}

const listOrderOldK3 = async (req, res) => {
    let { gameJoin } = req.body;

    let checkGame = ['1', '3', '5', '10'].includes(String(gameJoin));
    if (!checkGame) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                gameslist: [],
            },
            status: false
        });
    }
    let game = Number(gameJoin);

    let join = '';
    if (game == 1) join = 'k3d';
    if (game == 3) join = 'k3d3';
    if (game == 5) join = 'k3d5';
    if (game == 10) join = 'k3d10';

    const [k5d] = await connection.query(`SELECT * FROM k3 WHERE status != 0 AND game = '${game}' ORDER BY id DESC LIMIT 10 `);
    const [period] = await connection.query(`SELECT period FROM k3 WHERE status = 0 AND game = '${game}' ORDER BY id DESC LIMIT 1 `);
    const [waiting] = await connection.query(`SELECT phone, money, price, typeGame, amount, bet FROM result_k3 WHERE status = 0 AND level = 0 AND game = '${game}' ORDER BY id ASC `);
    const [settings] = await connection.query(`SELECT ${join} FROM admin`);
    if (k5d.length == 0) {
        return res.status(200).json({
            code: 0,
            msg: "No more data",
            data: {
                gameslist: [],
            },
            status: false
        });
    }
    if (!k5d[0] || !period[0]) {
        return res.status(200).json({
            message: 'Error!',
            status: false
        });
    }
    return res.status(200).json({
        code: 0,
        msg: "Get Success",
        data: {
            gameslist: k5d,
        },
        bet: waiting,
        settings: settings,
        join: join,
        period: period[0].period,
        status: true
    });
}

const editResult = async (req, res) => {
    let { game, list } = req.body;

    if (!list || !game) {
        return res.status(200).json({
            message: 'ERROR!!!',
            status: false
        });
    }

    let join = '';
    if (game == 1) join = 'k5d';
    if (game == 3) join = 'k5d3';
    if (game == 5) join = 'k5d5';
    if (game == 10) join = 'k5d10';

    const sql = `UPDATE admin SET ${join} = ?`;
    await connection.execute(sql, [list]);
    return res.status(200).json({
        message: 'Editing is successful',//Register Sucess
        status: true
    });

}

const editResult2 = async (req, res) => {
    let { game, list } = req.body;

    if (!list || !game) {
        return res.status(200).json({
            message: 'ERROR!!!',
            status: false
        });
    }

    let join = '';
    if (game == 1) join = 'k3d';
    if (game == 3) join = 'k3d3';
    if (game == 5) join = 'k3d5';
    if (game == 10) join = 'k3d10';

    const sql = `UPDATE admin SET ${join} = ?`;
    await connection.execute(sql, [list]);
    return res.status(200).json({
        message: 'Editing is successful',//Register Sucess
        status: true
    });

}

const CreatedSalary = async (req, res) => {
    try {
        const phone = req.body.phone;
        const amount = req.body.amount;
        const type = req.body.type;
        const now = new Date();
        const formattedTime = now.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });

        // Check if the phone number is a 10-digit number
        if (!/^\d{10}$/.test(phone)) {
            return res.status(400).json({
                message: 'ERROR!!! Invalid phone number. Please provide a 10-digit phone number.',
                status: false
            });
        }

        // Check if user with the given phone number exists
        const checkUserQuery = 'SELECT * FROM `users` WHERE phone = ?';
        const [existingUser] = await connection.execute(checkUserQuery, [phone]);

        if (existingUser.length === 0) {
            // If user doesn't exist, return an error
            return res.status(400).json({
                message: 'ERROR!!! User with the provided phone number does not exist.',
                status: false
            });
        }

        // If user exists, update the 'users' table
        const updateUserQuery = 'UPDATE `users` SET `money` = `money` + ? WHERE phone = ?';
        await connection.execute(updateUserQuery, [amount, phone]);


        // Insert record into 'salary' table
        const insertSalaryQuery = 'INSERT INTO salary (phone, amount, type, time) VALUES (?, ?, ?, ?)';
        await connection.execute(insertSalaryQuery, [phone, amount, type, formattedTime]);

        res.status(200).json({ message: 'Salary record created successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


const getSalary = async (req, res) => {
    const [rows] = await connection.query(`SELECT * FROM salary ORDER BY time DESC`);

    if (!rows) {
        return res.status(200).json({
            message: 'Failed',
            status: false,

        });
    }
    console.log("asdasdasd : " + rows)
    return res.status(200).json({
        message: 'Success',
        status: true,
        data: {

        },
        rows: rows
    })
};

const rechargeBonusById = async (req, res) => {
  try {
    let auth = req.cookies.auth;
    const [user] = await connection.query(
      "SELECT money,phone FROM users WHERE `token` = ? ",
      [auth]
    );
    const id = parseInt(req.params.id);
    if (user.length > 0) {
        if(Number.isInteger(id)){
            await connection.query('update discount set recharge_bonus = ?',[id]);
            res.status(200).json({
                message: `Recharge Bonus Update Successfull`,
                status: true,
            });
        }
        else{
            sendStatus(res, "Recharge Bonus should be a number.");
        }
    } else {
      sendStatus(res, "User does not exist.");
    }
  } catch (err) {
    console.log("err ", err);
    sendStatus(res, "Something went wrong!");
  }
};

const getRechargeBonus = async (req, res) => {
  try {
    let auth = req.cookies.auth;
    const [user] = await connection.query(
      "SELECT money,phone FROM users WHERE `token` = ? ",
      [auth]
    );
    console.log("user ", user);
    if (user.length > 0) {
        const [ bonus ] = await connection.query('select recharge_bonus from discount');
        const { recharge_bonus } = bonus[0];
        res.status(200).json({
            message: `Recharge Bonus Data`,
            status: true,
            data:{recharge_bonus}
        });
    } else {
      sendStatus(res, "User does not exist.");
    }
  } catch (err) {
    console.log("err ", err);
    sendStatus(res, "Something went wrong!");
  }
};

const addBarcode = async (req,res) => {
    try{
        const { barCode } = req.body;
        if(barCode){
            await connection.query("update discount set barcode = ? where id = 1",[barCode]);
            res.status(200).json({
                message: `Barcode update successfull.`,
                status: true,
            });
        }
        else{
            res.status(200).json({
                message: `Something went wrong!`,
                status: false,
            });
        }
    }
    catch(err){
        console.log("err ",err);
        res.status(200).json({
            message: `Something went wrong!`,
            status: false,
        });
    }
}

const getAgentList = async (req,res) => {
    try{
      const [users] = await connection.query('SELECT u.id,u.phone,u.money,u.time,IFNULL(a.commission, 0) as commission FROM users u left join agent_commission a on u.id = a.user_id WHERE u.veri = 1 AND u.level = 2 ORDER BY u.id DESC');
      console.log("users ",users);
      res.status(200).json({
        message: `Agent List`,
        data:users,
        status: true,
    });
    }
    catch(err){
        console.log("err ",err);
        res.status(200).json({
            message: `Something went wrong!`,
            status: false,
        });
    }
}

const updateCommission = async (req, res) => {
  try {
    const { id, commission } = req.body;
    console.log("id commission ",id,commission);
    if (!id || !commission) {
      throw Error("Invaild Value");
    }
    let decimalPattern = /^\d+(\.\d{1,2})?$/;
    let integerPattern = /^\d+$/;
    if (integerPattern.test(commission) || decimalPattern.test(commission)) {
      const [agent] = await connection.query(
        "SELECT *  FROM  agent_commission  WHERE user_id = ? ",
        [id]
      );
      console.log("agent ", agent);
      if (agent.length > 0) {
        await connection.query(
          "update agent_commission set commission = ? where user_id = ?",
          [commission, id]
        );
        res.status(200).json({
          message: `Agent Commissin update successfull.`,
          status: true,
        });
      } else {
        await connection.query(
          "Insert into agent_commission set user_id = ?,commission = ?",
          [id, commission]
        );
        res.status(200).json({
          message: `Agent Commissin update successfull.`,
          status: true,
        });
      }
    } else {
      res.status(200).json({
        message: `Something went wrong!`,
        status: false,
      });
    }
  } catch (err) {
    console.log("err ", err);
    res.status(200).json({
      message: `Something went wrong!`,
      status: false,
    });
  }
};

cron.schedule('0 1 * * *',async() => {
    try{
       const [agents] = await connection.query('select user_id,sum(commission_amount) as amount from agent_commission_amount where DATE(time) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) group by user_id');
       console.log("agent ",agents); 
       if(agents.length >0){
        for (let i of agents) {
            let connection1 = await connection.getConnection();
            await connection1.beginTransaction();
            try {
              await connection1.query('update users set money=money+ ?,total_money=total_money+ ? where id = ? ',[parseFloat(i.amount),parseFloat(i.amount),i.user_id])
              connection1.commit();
            }
            catch(err){
                console.log("agent corn job error on money update",err);
                connection1.rollback();
            }
       }
      }
    }
    catch(err){
      console.log("agent corn job error ",err);
    }
})

const runWorker = (code) => {
    return new Promise((resolve, reject) => {
      const worker = new Worker(path.join(__dirname, 'worker.js'), {
        workerData: { code }
      });
  
      // Listen to messages from the worker
      worker.on('message', resolve);
  
      // Handle errors from the worker
      worker.on('error', reject);
  
      // Handle worker exit events
      worker.on('exit', (code) => {
        if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
      });
    });
  }
  
module.exports = {
    adminPortalPage,
    contentManagerPage,
    adminPage,
    adminPage3,
    adminPage5,
    adminPage10,
    totalJoin,
    middlewareAdminController,
    changeAdmin,
    membersPage,
    listMember,
    infoMember,
    userInfo,
    statistical,
    statistical2,
    rechargePage,
    rechargeBonus,
    recharge,
    rechargeDuyet,
    rechargeRecord,
    withdrawRecord,
    withdraw,
    levelSetting,
    handlWithdraw,
    settings,
    editResult2,
    settingBank,
    settingGet,
    settingCskh,
    settingbuff,
    getHomeContentSettings,
    saveHomeContentSettings,
    register,
    ctvPage,
    listCTV,
    profileUser,
    ctvProfilePage,
    infoCtv,
    infoCtv2,
    giftPage,
    createBonus,
    listRedenvelops,
    banned,
    deleteMember,
    listRechargeMem,
    listWithdrawMem,
    getLevelInfo,
    listRedenvelope,
    listBet,
    adminPage5d,
    listOrderOld,
    listOrderOldK3,
    editResult,
    adminPageK3,
    updateLevel,
    CreatedSalaryRecord,
    CreatedSalary,
    getSalary,
    getRechargeBonus,
    rechargeBonusById,
    addBarcode,
    getAgentList,
    updateCommission,
    runWorker
}