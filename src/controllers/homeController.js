import connection from "../config/connectDB";
import jwt from 'jsonwebtoken'
import md5 from "md5";
// import e from "express";

const DEFAULT_HOME_CAROUSEL_BANNERS = [
    { image_url: '/img/banner/banner-1.png', link_url: '', sort_order: 1 },
    { image_url: '/img/banner/banner-2.png', link_url: '', sort_order: 2 },
    { image_url: '/img/banner/banner-3.png', link_url: '', sort_order: 3 },
    { image_url: '/img/banner/banner-4.jpg', link_url: '', sort_order: 4 },
];

const DEFAULT_HOME_POPUP_BANNER = {
    title: 'SUPER EVENT !!!',
    message: 'Recharge on any LONDON CLUB channel and get bonus offers on selected days.',
    image_url: '/img/banner/banner-2.png',
    button_text: 'VIP LONDON CLUB',
    button_link: '#',
    is_enabled: 1,
};

const loadHomeContentSettings = async () => {
    try {
        const [carouselRows] = await connection.query(
            'SELECT image_url, link_url, sort_order FROM home_carousel_banners WHERE is_active = 1 ORDER BY sort_order ASC, id ASC'
        );
        const [popupRows] = await connection.query(
            'SELECT title, message, image_url, button_text, button_link, is_enabled FROM home_popup_banner WHERE id = 1 LIMIT 1'
        );

        const carouselBanners = carouselRows.length
            ? carouselRows.map((item) => ({
                image_url: String(item.image_url || '').trim(),
                link_url: String(item.link_url || '').trim(),
                sort_order: Number(item.sort_order || 0),
            })).filter((item) => item.image_url)
            : DEFAULT_HOME_CAROUSEL_BANNERS;

        const popupRow = popupRows[0] || DEFAULT_HOME_POPUP_BANNER;
        const popupBanner = {
            title: String(popupRow.title || DEFAULT_HOME_POPUP_BANNER.title).trim(),
            message: String(popupRow.message || DEFAULT_HOME_POPUP_BANNER.message).trim(),
            image_url: String(popupRow.image_url || DEFAULT_HOME_POPUP_BANNER.image_url).trim(),
            button_text: String(popupRow.button_text || DEFAULT_HOME_POPUP_BANNER.button_text).trim(),
            button_link: String(popupRow.button_link || DEFAULT_HOME_POPUP_BANNER.button_link).trim(),
            is_enabled: Number(popupRow.is_enabled ?? DEFAULT_HOME_POPUP_BANNER.is_enabled) === 1 ? 1 : 0,
        };

        return { carouselBanners, popupBanner };
    } catch (error) {
        // The content tables may not exist yet in some environments.
        return {
            carouselBanners: DEFAULT_HOME_CAROUSEL_BANNERS,
            popupBanner: DEFAULT_HOME_POPUP_BANNER,
        };
    }
};

const homePage = async (req, res) => {
    const [settings] = await connection.query('SELECT `app` FROM admin');
    let app = settings[0].app;
    const { carouselBanners, popupBanner } = await loadHomeContentSettings();
    return res.render("home/index.ejs", { app, carouselBanners, popupBanner });
}

const activityPage = async (req, res) => {
    return res.render("checkIn/activity.ejs");
}

const rebatePage = async (req, res) => {
    return res.render("checkIn/rebate.ejs");
}

const vipPage = async (req, res) => {
    return res.render("checkIn/vip.ejs");
}

const jackpotPage = async (req, res) => {
    return res.render("checkIn/jackpot.ejs");
}

const dailytaskPage = async (req, res) => {
    return res.render("checkIn/dailytask.ejs");
}

const invibonusPage = async (req, res) => {
    return res.render("checkIn/invibonus.ejs");
}

const checkInPage = async (req, res) => {
    return res.render("checkIn/checkIn.ejs");
}

const checkDes = async (req, res) => {
    return res.render("checkIn/checkDes.ejs");
}

const checkRecord = async (req, res) => {
    return res.render("checkIn/checkRecord.ejs");
}

const addBank = async (req, res) => {
    return res.render("wallet/addbank.ejs");
}

// promotion
const promotionPage = async (req, res) => {
    return res.render("promotion/promotion.ejs");
}

const promotion1Page = async (req, res) => {
    return res.render("promotion/promotion1.ejs");
}

const promotionmyTeamPage = async (req, res) => {
    return res.render("promotion/myTeam.ejs");
}

const promotionDesPage = async (req, res) => {
    return res.render("promotion/promotionDes.ejs");
}

const comhistoryPage = async (req, res) => {
    return res.render("promotion/comhistory.ejs");
}

const tutorialPage = async (req, res) => {
    return res.render("promotion/tutorial.ejs");
}

const bonusRecordPage = async (req, res) => {
    return res.render("promotion/bonusrecord.ejs");
}

// wallet


const transactionhistoryPage = async (req, res) => {
    return res.render("wallet/transactionhistory.ejs");
}


const walletPage = async (req, res) => {
    return res.render("wallet/index.ejs");
}

const rechargePage = async (req, res) => {
    return res.render("wallet/recharge.ejs", {
        MinimumMoney: process.env.MINIMUM_MONEY
    });
}

const rechargerecordPage = async (req, res) => {
    return res.render("wallet/rechargerecord.ejs");
}

const withdrawalPage = async (req, res) => {
    return res.render("wallet/withdrawal.ejs");
}

const withdrawalrecordPage = async (req, res) => {
    return res.render("wallet/withdrawalrecord.ejs");
}
const transfer = async (req, res) => {
    return res.render("wallet/transfer.ejs");
}

// member page
const mianPage = async (req, res) => {
    let auth = req.cookies.auth;
    let user = [];
    try {
        [user] = await connection.query('SELECT `level`, `is_admin`, `is_manager` FROM users WHERE `token` = ? ', [auth]);
    } catch (error) {
        // Keep account page working on databases that still have only legacy role columns.
        [user] = await connection.query('SELECT `level` FROM users WHERE `token` = ? ', [auth]);
    }
    const [settings] = await connection.query('SELECT `cskh` FROM admin');
    let cskh = settings[0].cskh;
    const info = user[0] || {};
    const level = Number(info.level || 0);
    const isAdmin = Number(info.is_admin || 0);
    const isManager = Number(info.is_manager || 0);
    return res.render("member/index.ejs", { level, cskh, isAdmin, isManager });
}
const aboutPage = async (req, res) => {
    return res.render("member/about/index.ejs");
}

const recordsalary = async (req, res) => {
    return res.render("member/about/recordsalary.ejs");
}

const privacyPolicy = async (req, res) => {
    return res.render("member/about/privacyPolicy.ejs");
}

const newtutorial = async (req, res) => {
    return res.render("member/newtutorial.ejs");
}

const forgot = async (req, res) => {
    let auth = req.cookies.auth;
    const [user] = await connection.query('SELECT `time_otp` FROM users WHERE token = ? ', [auth]);
    let time = user[0].time_otp;
    return res.render("member/forgot.ejs", { time });
}

const redenvelopes = async (req, res) => {
    return res.render("member/redenvelopes.ejs");
}

const riskAgreement = async (req, res) => {
    return res.render("member/about/riskAgreement.ejs");
}

const myProfilePage = async (req, res) => {
    return res.render("member/myProfile.ejs");
}

const getSalaryRecord = async (req, res) => {
    const auth = req.cookies.auth;

    const [rows] = await connection.query(`SELECT * FROM users WHERE token = ?`, [auth]);
    let rowstr = rows[0];
    if (!rows) {
        return res.status(200).json({
            message: 'Failed',
            status: false,

        });
    }
    const [getPhone] = await connection.query(
        `SELECT * FROM salary WHERE phone = ? ORDER BY time DESC`,
        [rowstr.phone]
    );


    console.log("asdasdasd : " + [rows.phone])
    return res.status(200).json({
        message: 'Success',
        status: true,
        data: {

        },
        rows: getPhone,
    })
}


const rebateHistory = async (req, res) => {
    return res.render("checkIn/rebateHistory.ejs");
}

const expHistory = async (req, res) => {
    return res.render("checkIn/vipHistory.ejs");
}

const safe = async (req, res) => {
    return res.render("checkIn/safe.ejs");
}

const safeHistory = async (req, res) => {
    return res.render("checkIn/safeHistory.ejs");
}


module.exports = {
    homePage,
    checkInPage,
    invibonusPage,
    rebatePage,
    jackpotPage,
    vipPage,
    activityPage,
    dailytaskPage,
    promotionPage,
    promotion1Page,
    walletPage,
    mianPage,
    myProfilePage,
    promotionmyTeamPage,
    promotionDesPage,
    comhistoryPage,
    tutorialPage,
    bonusRecordPage,
    rechargePage,
    rechargerecordPage,
    withdrawalPage,
    withdrawalrecordPage,
    aboutPage,
    privacyPolicy,
    riskAgreement,
    newtutorial,
    redenvelopes,
    forgot,
    checkDes,
    checkRecord,
    addBank,
    transfer,
    recordsalary,
    getSalaryRecord,
    transactionhistoryPage,
    rebateHistory,
    expHistory,
    safe,
    safeHistory
}