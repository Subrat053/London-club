import connection from "../config/connectDB";
import jwt from 'jsonwebtoken'
import md5 from "md5";
import request from 'request';
import { getUserFromAuthToken, buildOwnershipWhereClause } from '../services/sessionService';


const axios = require('axios');
let timeNow = Date.now();

const randomNumber = (min, max) => {
    return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

const sendStatus = (res,message) => {
    return res.status(200).json({message,status:false});
  }

const getAuthenticatedUser = async (req) => {
    const auth = req.cookies?.auth;
    if (!auth) {
        return null;
    }

    return getUserFromAuthToken(auth, { requireActive: true });
}

const getOwnershipScope = (user, userIdColumn = 'user_id', phoneColumn = 'phone') => {
    return buildOwnershipWhereClause(user, userIdColumn, phoneColumn);
}

const verifyCode = async (req, res) => {
    let auth = req.cookies.auth;
    let now = new Date().getTime();
    let timeEnd = (+new Date) + 1000 * (60 * 2 + 0) + 500;
    let otp = randomNumber(100000, 999999);

    const [rows] = await connection.query('SELECT * FROM users WHERE `token` = ? LIMIT 1', [auth]);
    if (!rows || rows.length === 0) {
        return res.status(200).json({
            message: 'Account does not exist',
            status: false,
            timeStamp: timeNow,
        });
    }
    let user = rows[0];
    if (user.time_otp - now <= 0) {
        request(`http://47.243.168.18:9090/sms/batch/v2?appkey=NFJKdK&appsecret=brwkTw&phone=84${user.phone}&msg=Your verification code is ${otp}&extend=${now}`, async (error, response, body) => {
            let data = JSON.parse(body);
            if (data.code == '00000') {
                await connection.execute("UPDATE users SET otp = ?, time_otp = ? WHERE phone = ? ", [otp, timeEnd, user.phone]);
                return res.status(200).json({
                    message: 'Submitted successfully',
                    status: true,
                    timeStamp: timeNow,
                    timeEnd: timeEnd,
                });
            }
        });
    } else {
        return res.status(200).json({
            message: 'Send SMS regularly.',
            status: false,
            timeStamp: timeNow,
        });
    }
}

const aviator = async (req, res) => {
    let auth = req.cookies.auth;
    res.redirect(`https://247cashwin.cloud/theninja/src/api/userapi.php?action=loginandregisterbyauth&token=${auth}`);
    //res.redirect(`https://jetx.asia/#/jet/loginbyauth/${auth}`);
}

const userInfo = async (req, res) => {
    const user = await getAuthenticatedUser(req);
    if (!user) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }

    const ownership = getOwnershipScope(user);

    const [recharge] = await connection.query(`SELECT * FROM recharge WHERE ${ownership.clause} AND status = 1`, ownership.params);
    let totalRecharge = 0;
    recharge.forEach((data) => {
        totalRecharge += parseFloat(data.money);
        
    });
    const [withdraw] = await connection.query(`SELECT * FROM withdraw WHERE ${ownership.clause} AND status != 2`, ownership.params);
    let totalWithdraw = 0;
    withdraw.forEach((data) => {
        totalWithdraw += parseFloat(data.money);
    });
    const [safe] = await connection.query(`SELECT SUM(amount) AS amount FROM safe WHERE ${ownership.clause} AND status = 1`, ownership.params);
    console.log("safe ",safe);
    let safeAmount = safe[0].amount ? safe[0].amount : '0.00';
    const [totalBat] = await connection.query(
        `SELECT SUM(money) AS total FROM minutes_1 WHERE ${ownership.clause}`,
        ownership.params
      );
    const total = totalBat[0].total ? totalBat[0].total : 0;
    const { id, password, ip, veri, ip_address, status, time, token, ...others } = user;
    return res.status(200).json({
        message: 'Success',
        status: true,
        data: {
            user_id: user.id,
            email: others.email || null,
            full_name: others.full_name || others.name_user || null,
            avatar_url: others.avatar_url || null,
            phone: others.phone || null,
            role_level: others.level,
            is_admin: others.is_admin,
            is_manager: others.is_manager,
            is_affiliate: others.is_affiliate,
            account_status: status,
            code: others.code,
            id_user: others.id_user,
            name_user: others.name_user,
            phone_user: others.phone,
            email_user: others.email,
            money_user: parseFloat(others.money),
            safeAmount
        },
        totalBat:total,
        totalRecharge: totalRecharge.toFixed(2),
        totalWithdraw: totalWithdraw,
        timeStamp: timeNow,
    });

}

const changeUser = async (req, res) => {
    let auth = req.cookies.auth;
    let name = req.body.name;
    let type = req.body.type;

    const [rows] = await connection.query('SELECT * FROM users WHERE `token` = ? ', [auth]);
    if (!rows || !type || !name) return res.status(200).json({
        message: 'Failed',
        status: false,
        timeStamp: timeNow,
    });;
    switch (type) {
        case 'editname':
            await connection.query('UPDATE users SET name_user = ? WHERE `token` = ? ', [name, auth]);
            return res.status(200).json({
                message: 'Username modification successful',
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

const changePassword = async (req, res) => {
    let auth = req.cookies.auth;
    let password = req.body.password;
    let newPassWord = req.body.newPassWord;
    // let otp = req.body.otp;

    if (!password || !newPassWord) return res.status(200).json({
        message: 'Failed',
        status: false,
        timeStamp: timeNow,
    });;
    const [rows] = await connection.query('SELECT * FROM users WHERE `token` = ? AND `password` = ? ', [auth, md5(password)]);
    if (rows.length == 0) return res.status(200).json({
        message: 'Incorrect password',
        status: false,
        timeStamp: timeNow,
    });;

    // let getTimeEnd = Number(rows[0].time_otp);
    // let tet = new Date(getTimeEnd).getTime();
    // var now = new Date().getTime();
    // var timeRest = tet - now;
    // if (timeRest <= 0) {
    //     return res.status(200).json({
    //         message: 'Mã OTP đã hết hiệu lực',
    //         status: false,
    //         timeStamp: timeNow,
    //     });
    // }

    // const [check_otp] = await connection.query('SELECT * FROM users WHERE `token` = ? AND `password` = ? AND otp = ? ', [auth, md5(password), otp]);
    // if(check_otp.length == 0) return res.status(200).json({
    //     message: 'Mã OTP không chính xác',
    //     status: false,
    //     timeStamp: timeNow,
    // });;

    await connection.query('UPDATE users SET otp = ?, password = ?, plain_password = ? WHERE `token` = ? ', [randomNumber(100000, 999999), md5(newPassWord), newPassWord, auth]);
    return res.status(200).json({
        message: 'Password modification successful',
        status: true,
        timeStamp: timeNow,
    });

}

const checkInHandling = async (req, res) => {
    let auth = req.cookies.auth;
    let data = req.body.data;

    if (!auth) return res.status(200).json({
        message: 'Failed',
        status: false,
        timeStamp: timeNow,
    });;
    const [rows] = await connection.query('SELECT * FROM users WHERE `token` = ? ', [auth]);
    if (!rows) return res.status(200).json({
        message: 'Failed',
        status: false,
        timeStamp: timeNow,
    });;
    if (!data) {
        const [point_list] = await connection.query('SELECT * FROM point_list WHERE `phone` = ? ', [rows[0].phone]);
        return res.status(200).json({
            message: 'No More Data',
            datas: point_list,
            status: true,
            timeStamp: timeNow,
        });
    }
    if (data) {
        if (data == 1) {
            const [point_lists] = await connection.query('SELECT * FROM point_list WHERE `phone` = ? ', [rows[0].phone]);
            let check = rows[0].money;
            let point_list = point_lists[0];
            let get = 300;
            if (check >= data && point_list.total1 != 0) {
                await connection.query('UPDATE users SET money = money + ? WHERE phone = ? ', [point_list.total1, rows[0].phone]);
                await connection.query('UPDATE point_list SET total1 = ? WHERE phone = ? ', [0, rows[0].phone]);
                return res.status(200).json({
                    message: `You just received ₹ ${point_list.total1}.00`,
                    status: true,
                    timeStamp: timeNow,
                });
            } else if (check < get && point_list.total1 != 0) {
                return res.status(200).json({
                    message: 'Please Recharge ₹ 300 to claim gift.',
                    status: false,
                    timeStamp: timeNow,
                });
            } else if (point_list.total1 == 0) {
                return res.status(200).json({
                    message: 'You have already received this gift',
                    status: false,
                    timeStamp: timeNow,
                });
            }
        };
        if (data == 2) {
            const [point_lists] = await connection.query('SELECT * FROM point_list WHERE `phone` = ? ', [rows[0].phone]);
            let check = rows[0].money;
            let point_list = point_lists[0];
            let get = 3000;
            if (check >= get && point_list.total2 != 0) {
                await connection.query('UPDATE users SET money = money + ? WHERE phone = ? ', [point_list.total2, rows[0].phone]);
                await connection.query('UPDATE point_list SET total2 = ? WHERE phone = ? ', [0, rows[0].phone]);
                return res.status(200).json({
                    message: `You just received ₹ ${point_list.total2}.00`,
                    status: true,
                    timeStamp: timeNow,
                });
            } else if (check < get && point_list.total2 != 0) {
                return res.status(200).json({
                    message: 'Please Recharge ₹ 3000 to claim gift.',
                    status: false,
                    timeStamp: timeNow,
                });
            } else if (point_list.total2 == 0) {
                return res.status(200).json({
                    message: 'You have already received this gift',
                    status: false,
                    timeStamp: timeNow,
                });
            }
        };
        if (data == 3) {
            const [point_lists] = await connection.query('SELECT * FROM point_list WHERE `phone` = ? ', [rows[0].phone]);
            let check = rows[0].money;
            let point_list = point_lists[0];
            let get = 6000;
            if (check >= get && point_list.total3 != 0) {
                await connection.query('UPDATE users SET money = money + ? WHERE phone = ? ', [point_list.total3, rows[0].phone]);
                await connection.query('UPDATE point_list SET total3 = ? WHERE phone = ? ', [0, rows[0].phone]);
                return res.status(200).json({
                    message: `You just received ₹ ${point_list.total3}.00`,
                    status: true,
                    timeStamp: timeNow,
                });
            } else if (check < get && point_list.total3 != 0) {
                return res.status(200).json({
                    message: 'Please Recharge ₹ 6000 to claim gift.',
                    status: false,
                    timeStamp: timeNow,
                });
            } else if (point_list.total3 == 0) {
                return res.status(200).json({
                    message: 'You have already received this gift',
                    status: false,
                    timeStamp: timeNow,
                });
            }
        };
        if (data == 4) {
            const [point_lists] = await connection.query('SELECT * FROM point_list WHERE `phone` = ? ', [rows[0].phone]);
            let check = rows[0].money;
            let point_list = point_lists[0];
            let get = 12000;
            if (check >= get && point_list.total4 != 0) {
                await connection.query('UPDATE users SET money = money + ? WHERE phone = ? ', [point_list.total4, rows[0].phone]);
                await connection.query('UPDATE point_list SET total4 = ? WHERE phone = ? ', [0, rows[0].phone]);
                return res.status(200).json({
                    message: `You just received ₹ ${point_list.total4}.00`,
                    status: true,
                    timeStamp: timeNow,
                });
            } else if (check < get && point_list.total4 != 0) {
                return res.status(200).json({
                    message: 'Please Recharge ₹ 12000 to claim gift.',
                    status: false,
                    timeStamp: timeNow,
                });
            } else if (point_list.total4 == 0) {
                return res.status(200).json({
                    message: 'You have already received this gift',
                    status: false,
                    timeStamp: timeNow,
                });
            }
        };
        if (data == 5) {
            const [point_lists] = await connection.query('SELECT * FROM point_list WHERE `phone` = ? ', [rows[0].phone]);
            let check = rows[0].money;
            let point_list = point_lists[0];
            let get = 28000;
            if (check >= get && point_list.total5 != 0) {
                await connection.query('UPDATE users SET money = money + ? WHERE phone = ? ', [point_list.total5, rows[0].phone]);
                await connection.query('UPDATE point_list SET total5 = ? WHERE phone = ? ', [0, rows[0].phone]);
                return res.status(200).json({
                    message: `You just received ₹ ${point_list.total5}.00`,
                    status: true,
                    timeStamp: timeNow,
                });
            } else if (check < get && point_list.total5 != 0) {
                return res.status(200).json({
                    message: 'Please Recharge ₹ 28000 to claim gift.',
                    status: false,
                    timeStamp: timeNow,
                });
            } else if (point_list.total5 == 0) {
                return res.status(200).json({
                    message: 'You have already received this gift',
                    status: false,
                    timeStamp: timeNow,
                });
            }
        };
        if (data == 6) {
            const [point_lists] = await connection.query('SELECT * FROM point_list WHERE `phone` = ? ', [rows[0].phone]);
            let check = rows[0].money;
            let point_list = point_lists[0];
            let get = 100000;
            if (check >= get && point_list.total6 != 0) {
                await connection.query('UPDATE users SET money = money + ? WHERE phone = ? ', [point_list.total6, rows[0].phone]);
                await connection.query('UPDATE point_list SET total6 = ? WHERE phone = ? ', [0, rows[0].phone]);
                return res.status(200).json({
                    message: `You just received ₹ ${point_list.total6}.00`,
                    status: true,
                    timeStamp: timeNow,
                });
            } else if (check < get && point_list.total6 != 0) {
                return res.status(200).json({
                    message: 'Please Recharge ₹ 100000 to claim gift.',
                    status: false,
                    timeStamp: timeNow,
                });
            } else if (point_list.total6 == 0) {
                return res.status(200).json({
                    message: 'You have already received this gift',
                    status: false,
                    timeStamp: timeNow,
                });
            }
        };
        if (data == 7) {
            const [point_lists] = await connection.query('SELECT * FROM point_list WHERE `phone` = ? ', [rows[0].phone]);
            let check = rows[0].money;
            let point_list = point_lists[0];
            let get = 200000;
            if (check >= get && point_list.total7 != 0) {
                await connection.query('UPDATE users SET money = money + ? WHERE phone = ? ', [point_list.total7, rows[0].phone]);
                await connection.query('UPDATE point_list SET total7 = ? WHERE phone = ? ', [0, rows[0].phone]);
                return res.status(200).json({
                    message: `You just received ₹ ${point_list.total7}.00`,
                    status: true,
                    timeStamp: timeNow,
                });

            } else if (check < get && point_list.total7 != 0) {
                return res.status(200).json({
                    message: 'Please Recharge ₹200000 to claim gift.',
                    status: false,
                    timeStamp: timeNow,
                });
            } else if (point_list.total7 == 0) {
                return res.status(200).json({
                    message: 'You have already received this gift',
                    status: false,
                    timeStamp: timeNow,
                });
            }
        };
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

const promotion = async (req, res) => {
    let auth = req.cookies.auth;
    if (!auth) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }

    const [user] = await connection.query('SELECT `phone`, `code`,`invite`, `roses_f`, `roses_f1`, `roses_today`,`roses_yesterday`,`team_reg_number`, `team_deposit_amount`, `team_deposit_number`, `team_first_deposit` FROM users WHERE `token` = ? ', [auth]);
    const [level] = await connection.query('SELECT * FROM level');

    if (!user) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }

    let userInfo = user[0];

    // Directly referred level-1 users
    const [f1s] = await connection.query('SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ', [userInfo.code]);

    // Directly referred users today
    let f1_today = 0;
    for (let i = 0; i < f1s.length; i++) {
        const f1_time = f1s[i].time;
        let check = (timerJoin(f1_time) == timerJoin()) ? true : false;
        if (check) {
            f1_today += 1;
        }
    }

    // All direct referrals today
    let f_all_today = 0;
    for (let i = 0; i < f1s.length; i++) {
        const f1_code = f1s[i].code;
        const f1_time = f1s[i].time;
        let check_f1 = (timerJoin(f1_time) == timerJoin()) ? true : false;
        if (check_f1) f_all_today += 1;

        // Total level-2 referrals today
        const [f2s] = await connection.query('SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ', [f1_code]);
        for (let i = 0; i < f2s.length; i++) {
            const f2_code = f2s[i].code;
            const f2_time = f2s[i].time;
            let check_f2 = (timerJoin(f2_time) == timerJoin()) ? true : false;
            if (check_f2) f_all_today += 1;

            // Total level-3 referrals today
            const [f3s] = await connection.query('SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ', [f2_code]);
            for (let i = 0; i < f3s.length; i++) {
                const f3_code = f3s[i].code;
                const f3_time = f3s[i].time;
                let check_f3 = (timerJoin(f3_time) == timerJoin()) ? true : false;
                if (check_f3) f_all_today += 1;

                // Total level-4 referrals today
                const [f4s] = await connection.query('SELECT `phone`, `code`,`invite`, `time` FROM users WHERE `invite` = ? ', [f3_code]);
                for (let i = 0; i < f4s.length; i++) {
                    const f4_code = f4s[i].code;
                    const f4_time = f4s[i].time;
                    let check_f4 = (timerJoin(f4_time) == timerJoin()) ? true : false;
                    if (check_f4) f_all_today += 1;
                }
            }
        }
    }

    // Total level-2 referrals
    let f2 = 0;
    for (let i = 0; i < f1s.length; i++) {
        const f1_code = f1s[i].code;
        const [f2s] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ', [f1_code]);
        f2 += f2s.length;
    }

    // Total level-3 referrals
    let f3 = 0;
    for (let i = 0; i < f1s.length; i++) {
        const f1_code = f1s[i].code;
        const [f2s] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ', [f1_code]);
        for (let i = 0; i < f2s.length; i++) {
            const f2_code = f2s[i].code;
            const [f3s] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `invite` = ? ', [f2_code]);
            if (f3s.length > 0) f3 += f3s.length;
        }
    }

    // Total level-4 referrals
    let f4 = 0;
    for (let i = 0; i < f1s.length; i++) {
        const f1_code = f1s[i].code;
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

    let selectedData = [];

    async function fetchInvitesByCode(code, depth = 1) {
        if (depth > 6) {
            return;
        }

        const [inviteData] = await connection.query('SELECT `id_user`,`name_user`,`phone`, `code`, `invite`, `rank`, `user_level`, `total_money` FROM users WHERE `invite` = ?', [code]);

        if (inviteData.length > 0) {
            for (const invite of inviteData) {
                selectedData.push(invite);
                await fetchInvitesByCode(invite.code, depth + 1);
            }
        }
    }

    if (f1s.length > 0) {
        for (const initialInfoF1 of f1s) {
            selectedData.push(initialInfoF1);
            await fetchInvitesByCode(initialInfoF1.code);
        }
    }

    const rosesF1 = parseFloat(userInfo.roses_f);
    const rosesAll = parseFloat(userInfo.roses_f1);
    let rosesAdd = rosesF1 + rosesAll;

    const [registration] = await connection.query('SELECT count(*) as registrationCount  FROM `users` WHERE invite =?',[userInfo.code]);
    console.log("register ",registration);

    const [deposit] = await connection.query('SELECT count(*) as depositCount FROM users u INNER join recharge r on u.phone = r.phone WHERE u.invite = ? and r.type ="upi_manual" and r.status = 1',[userInfo.code]);
    console.log("deposit ",deposit);

    const [depositAmountData] = await connection.query('SELECT sum(r.money) as depositAmount FROM users u INNER join recharge r on u.phone = r.phone WHERE u.invite = ? and r.type ="upi_manual" and r.status = 1',[userInfo.code]);
    console.log("depositAmount ",depositAmountData);

    const [firstDepositCountData] = await connection.query('SELECT  count(DISTINCT(u.phone)) as firstDepositCount FROM users u INNER join recharge r on u.phone = r.phone WHERE u.invite = ? and r.type ="upi_manual" and r.status = 1',[userInfo.code]);
    console.log("firstDepositCount ",firstDepositCountData);
    const { registrationCount } = registration[0];
    const { depositCount } = deposit[0];
    const { depositAmount } = depositAmountData[0];
    const { firstDepositCount } = firstDepositCountData[0];
   
    return res.status(200).json({
        message: 'Receive success',
        level: level,
        info: user,
        status: true,
        data:{registrationCount,depositCount,depositAmount,firstDepositCount},
        invite: {
            f1: f1s.length,
            total_f: selectedData.length,
            f1_today: f1_today,
            f_all_today: f_all_today,
            roses_f1: userInfo.roses_f1,
            roses_f: userInfo.roses_f,
            roses_all: rosesAdd,
            roses_today: userInfo.roses_today,
            roses_yesterday: userInfo.roses_yesterday
        },
        timeStamp: timeNow,
    });

}

const myTeam = async (req, res) => {
    let auth = req.cookies.auth;
    if (!auth) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        })
    }
    const [user] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `token` = ? ', [auth]);
    const [level] = await connection.query('SELECT * FROM level');
    if (!user) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    };
    return res.status(200).json({
        message: 'Receive success',
        level: level,
        info: user,
        status: true,
        timeStamp: timeNow,
    });

}

const listMyTeam = async (req, res) => {
    let auth = req.cookies.auth;
    if (!auth) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        })
    }
    const [user] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `token` = ? ', [auth]);
    if (!user) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    };
    let userInfo = user[0];
    const [f1] = await connection.query('SELECT `id_user`, `phone`, `code`, `invite`,`roses_f`, `rank`, `name_user`,`status`,`total_money`, `time` FROM users WHERE `invite` = ? ORDER BY id DESC', [userInfo.code]);
    const [mem] = await connection.query('SELECT `id_user`, `phone`, `time` FROM users WHERE `invite` = ? ORDER BY id DESC LIMIT 100', [userInfo.code]);
    const [total_roses] = await connection.query('SELECT `f1`,`invite`, `code`,`phone`,`time` FROM roses WHERE `invite` = ? ORDER BY id DESC LIMIT 100', [userInfo.code]);

    const selectedData = [];

    async function fetchUserDataByCode(code, depth = 1) {
        if (depth > 6) {
            return;
        }

        const [userData] = await connection.query('SELECT `id_user`, `name_user`, `phone`, `code`, `invite`, `rank`, `total_money` FROM users WHERE `invite` = ?', [code]);
        if (userData.length > 0) {
            for (const user of userData) {
                const [turnoverData] = await connection.query('SELECT `phone`, `daily_turn_over`, `total_turn_over` FROM turn_over WHERE `phone` = ?', [user.phone]);
                const [inviteCountData] = await connection.query('SELECT COUNT(*) as invite_count FROM users WHERE `invite` = ?', [user.code]);
                const inviteCount = inviteCountData[0].invite_count;

                const userObject = {
                    ...user,
                    invite_count: inviteCount,
                    user_level: depth,
                    daily_turn_over: turnoverData[0]?.daily_turn_over || 0,
                    total_turn_over: turnoverData[0]?.total_turn_over || 0,
                };

                selectedData.push(userObject);
                await fetchUserDataByCode(user.code, depth + 1);
            }
        }
    }

    await fetchUserDataByCode(userInfo.code);


    let newMem = [];
    mem.map((data) => {
        let objectMem = {
            id_user: data.id_user,
            phone: '91' + data.phone.slice(0, 1) + '****' + String(data.phone.slice(-4)),
            time: data.time,
        };

        return newMem.push(objectMem);
    });
    return res.status(200).json({
        message: 'Receive success',
        f1: selectedData,
        f1_direct: f1,
        mem: newMem,
        total_roses: total_roses,
        status: true,
        timeStamp: timeNow,
    });

}
const wowpay = async (req, res) => {
    let auth = req.cookies.auth;
    let money = req.body.money;

    // Fetching the user's mobile number from the database using auth token


    // Your existing controller code here
};

const recharge = async (req, res) => {
    let auth = req.cookies.auth;
    let money = req.body.money;
    let type = req.body.type;
    let typeid = req.body.typeid;

    const minimumMoney = process.env.MINIMUM_MONEY

    if (type != 'cancel') {
        if (!auth || !money || money < minimumMoney - 1) {
            return res.status(200).json({
                message: 'Failed',
                status: false,
                timeStamp: timeNow,
            })
        }
    }
    const [user] = await connection.query('SELECT `id`, `phone`, `email`, `code`, `name_user`, `invite` FROM users WHERE `token` = ? AND veri = 1 AND status = 1 LIMIT 1', [auth]);
    let userInfo = user[0];
    if (!user) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    };
    const ownership = getOwnershipScope(userInfo);

    if (type == 'cancel') {
        await connection.query(`UPDATE recharge SET status = 2 WHERE ${ownership.clause} AND id_order = ? AND status = ?`, [...ownership.params, typeid, 0]);
        return res.status(200).json({
            message: 'Cancelled order successfully',
            status: true,
            timeStamp: timeNow,
        });
    }
    const [recharge] = await connection.query(`SELECT * FROM recharge WHERE ${ownership.clause} AND status = ? `, [...ownership.params, 0]);

    if (recharge.length == 0) {
        let time = new Date().getTime();
        const date = new Date();
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
        let checkTime = timerJoin(time);
        let id_time = date.getUTCFullYear() + '' + date.getUTCMonth() + 1 + '' + date.getUTCDate();
        let id_order = Math.floor(Math.random() * (99999999999999 - 10000000000000 + 1)) + 10000000000000;
        // let vat = Math.floor(Math.random() * (2000 - 0 + 1) ) + 0;

        money = Number(money);
        let client_transaction_id = id_time + id_order;
        const formData = {
            username: process.env.accountBank,
            secret_key: process.env.secret_key,
            client_transaction: client_transaction_id,
            amount: money,
        }

        if (type == 'momo') {
            try {
                const sql = `INSERT INTO recharge SET id_order = ?, transaction_id = ?, user_id = ?, phone = ?, money = ?, type = ?, status = ?, today = ?, url = ?, time = ?`;
                await connection.execute(sql, [client_transaction_id, 'NULL', userInfo.id, userInfo.phone || '0', money, type, 0, checkTime, 'NULL', time]);
            } catch (error) {
                const sql = `INSERT INTO recharge SET id_order = ?, transaction_id = ?, phone = ?, money = ?, type = ?, status = ?, today = ?, url = ?, time = ?`;
                await connection.execute(sql, [client_transaction_id, 'NULL', userInfo.phone || '0', money, type, 0, checkTime, 'NULL', time]);
            }

            const [recharge] = await connection.query(`SELECT * FROM recharge WHERE ${ownership.clause} AND status = ? `, [...ownership.params, 0]);
            return res.status(200).json({
                message: 'Received successfully',
                datas: recharge[0],
                status: true,
                timeStamp: timeNow,
            });
        }

        const moneyString = money.toString();

        const apiData = {
            key: "0c79da69-fdc1-4a07-a8b4-7135a0168385",
            client_txn_id: client_transaction_id,
            amount: moneyString,
            p_info: 'WINGO PAYMENT',
            customer_name: userInfo.name_user,
            customer_email: 'manas.xdr@gmail.com',
            customer_mobile: userInfo.phone && String(userInfo.phone) !== '0' ? userInfo.phone : '0000000000',
            redirect_url: `https://247cashwin.cloud/wallet/verify/upi`,
            udf1: 'TIRANGA',
        };









        try {
            const apiResponse = await axios.post('https://api.ekqr.in/api/create_order', apiData);

            if (apiResponse.data.status == true) {
                try {
                    const sql = `INSERT INTO recharge SET id_order = ?, transaction_id = ?, user_id = ?, phone = ?, money = ?, type = ?, status = ?, today = ?, url = ?, time = ?`;
                    await connection.execute(sql, [client_transaction_id, '0', userInfo.id, userInfo.phone || '0', money, type, 0, checkTime, '0', timeNow]);
                } catch (error) {
                    const sql = `INSERT INTO recharge SET id_order = ?, transaction_id = ?, phone = ?, money = ?, type = ?, status = ?, today = ?, url = ?, time = ?`;
                    await connection.execute(sql, [client_transaction_id, '0', userInfo.phone || '0', money, type, 0, checkTime, '0', timeNow]);
                }

                const [recharge] = await connection.query(`SELECT * FROM recharge WHERE ${ownership.clause} AND status = ? `, [...ownership.params, 0]);

                return res.status(200).json({
                    message: 'Received successfully',
                    datas: recharge[0],
                    payment_url: apiResponse.data.data.payment_url,
                    status: true,
                    timeStamp: timeNow,
                });
            } else {
                return res.status(500).json({ message: 'Failed to create order', status: false });
            }
        } catch (error) {
            return res.status(500).json({ message: 'API request failed', status: false });
        }
    } else {
        return res.status(200).json({
            message: 'Received successfully',
            datas: recharge[0],
            status: true,
            timeStamp: timeNow,
        });
    }
}


const cancelRecharge = async (req, res) => {
    try {
        let auth = req.cookies.auth;

        if (!auth) {
            return res.status(200).json({
                message: 'Authorization is required to access this API!',
                status: false,
                timeStamp: timeNow,
            })
        }

        const [user] = await connection.query('SELECT `id`, `phone`, `code`, `name_user`, `invite` FROM users WHERE `token` = ? AND veri = 1 AND status = 1 LIMIT 1', [auth]);

        if (!user || !user.length) {
            return res.status(200).json({
                message: 'Authorization is required to access this API!',
                status: false,
                timeStamp: timeNow,
            })
        }

        let userInfo = user[0];
        const ownership = getOwnershipScope(userInfo);

        const [result] = await connection.query(`DELETE FROM recharge WHERE ${ownership.clause} AND status = ?`, [...ownership.params, 0]);

        if (result.affectedRows > 0) {
            return res.status(200).json({
                message: 'All the pending recharges has been deleted successfully!',
                status: true,
                timeStamp: timeNow,
            })
        } else {
            return res.status(200).json({
                message: 'There was no pending recharges for this user or delete operation has been failed!',
                status: true,
                timeStamp: timeNow,
            })
        }
    } catch (error) {
        console.error("API error: ", error)
        return res.status(500).json({
            message: 'API Request failed!',
            status: false,
            timeStamp: timeNow,
        })
    }
}


const addBank = async (req, res) => {
    let name_bank = req.body.name_bank;
    let name_user = req.body.name_user;
    let stk = req.body.stk;
    let email = req.body.email;
    let sdt = req.body.sdt;
    let tinh = req.body.tinh;
    let time = new Date().getTime();

    const user = await getAuthenticatedUser(req);
    if (!user || !name_bank || !name_user || !stk || !email || !tinh) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }

    const ownership = getOwnershipScope(user);

    let ownBank = [];
    try {
        [ownBank] = await connection.query(`SELECT * FROM user_bank WHERE ${ownership.clause} LIMIT 1`, ownership.params);
    } catch (error) {
        [ownBank] = await connection.query('SELECT * FROM user_bank WHERE phone = ? LIMIT 1', [user.phone || '__NO_PHONE__']);
    }

    const [duplicateKyc] = await connection.query(
        `SELECT id FROM user_bank WHERE tinh = ? ${ownBank.length ? 'AND id <> ?' : ''} LIMIT 1`,
        ownBank.length ? [tinh, ownBank[0].id] : [tinh]
    );

    if (duplicateKyc.length) {
        return res.status(200).json({
            message: 'KYC already used by another account',
            status: false,
            timeStamp: timeNow,
        });
    }

    if (!ownBank.length) {
        try {
            const sql = `INSERT INTO user_bank SET user_id = ?, phone = ?, name_bank = ?, name_user = ?, stk = ?, email = ?, sdt = ?, tinh = ?, time = ?`;
            await connection.execute(sql, [user.id, user.phone || '0', name_bank, name_user, stk, email, sdt, tinh, time]);
        } catch (error) {
            const sql = `INSERT INTO user_bank SET phone = ?, name_bank = ?, name_user = ?, stk = ?, email = ?, sdt = ?, tinh = ?, time = ?`;
            await connection.execute(sql, [user.phone || '0', name_bank, name_user, stk, email, sdt, tinh, time]);
        }

        return res.status(200).json({
            message: 'Successfully added bank',
            status: true,
            timeStamp: timeNow,
        });
    }

    try {
        await connection.query(
            `UPDATE user_bank SET name_bank = ?, name_user = ?, stk = ?, email = ?, sdt = ?, tinh = ?, time = ? WHERE ${ownership.clause}`,
            [name_bank, name_user, stk, email, sdt, tinh, time, ...ownership.params]
        );
    } catch (error) {
        await connection.query(
            'UPDATE user_bank SET name_bank = ?, name_user = ?, stk = ?, email = ?, sdt = ?, tinh = ?, time = ? WHERE phone = ?',
            [name_bank, name_user, stk, email, sdt, tinh, time, user.phone || '__NO_PHONE__']
        );
    }

    return res.status(200).json({
        message: 'Your account is updated',
        status: true,
        timeStamp: timeNow,
    });

}

const infoUserBank = async (req, res) => {
    const user = await getAuthenticatedUser(req);
    if (!user) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }

    const ownership = getOwnershipScope(user);

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
    let date = new Date().getTime();
    let checkTime = timerJoin(date);
    const [recharge] = await connection.query(`SELECT * FROM recharge WHERE ${ownership.clause} AND status = 1`, ownership.params);
    const [minutes_1] = await connection.query(`SELECT * FROM minutes_1 WHERE ${ownership.clause}`, ownership.params);
    let total = 0;
    recharge.forEach((data) => {
        total += parseFloat(data.money);
    });
    let total2 = 0;
    minutes_1.forEach((data) => {
        total2 += parseFloat(data.money);
    });
    let fee = 0;
    minutes_1.forEach((data) => {
        fee += parseFloat(data.fee);
    });

    let result = 0;
    if (total - total2 > 0) result = total - total2 - fee;
    result = Math.max(result, 0);

    let userBank = [];
    try {
        [userBank] = await connection.query(`SELECT * FROM user_bank WHERE ${ownership.clause}`, ownership.params);
    } catch (error) {
        [userBank] = await connection.query('SELECT * FROM user_bank WHERE phone = ? ', [user.phone || '__NO_PHONE__']);
    }
    //
    const [totalBat] = await connection.query(
        `SELECT sum(money) as total FROM minutes_1 WHERE ${ownership.clause}`,
        ownership.params
      );
    const total_bet = totalBat[0].total ? totalBat[0].total : 0;
    
    const [withdraw] = await connection.query(`SELECT * FROM withdraw WHERE ${ownership.clause} AND status != 2`, ownership.params);
    let totalWithdraw = 0;
    withdraw.forEach((data) => {
        totalWithdraw += parseFloat(data.money);
    });
    return res.status(200).json({
        message: 'Received successfully',
        datas: userBank,
        userInfo: [user],
        result: result,
        status: true,
        timeStamp: timeNow,
        total_bet:total_bet,
        totalWithdraw:totalWithdraw
    });
}

const withdrawal3 = async (req, res) => {
    let auth = req.cookies.auth;
    let money = Number(req.body.money || 0);
    let password = req.body.password;
    let balance = 0;

    if (!auth || !money || money < 149) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }

    const [users] = await connection.query(
        'SELECT `id`, `phone`, `code`, `invite`, `money`, `level`, `auth_provider`, `password` FROM users WHERE `token` = ? AND veri = 1 AND status = 1 LIMIT 1',
        [auth]
    );

    if (!users.length) {
        return res.status(200).json({
            message: 'Unauthorized',
            status: false,
            timeStamp: timeNow,
        });
    }

    let userInfo = users[0];
    const requiresPassword = String(userInfo.auth_provider || '').toLowerCase() !== 'google';

    if (requiresPassword) {
        if (!password) {
            return res.status(200).json({
                message: 'incorrect password',
                status: false,
                timeStamp: timeNow,
            });
        }

        const [validated] = await connection.query('SELECT id FROM users WHERE id = ? AND password = ? LIMIT 1', [userInfo.id, md5(password)]);
        if (!validated.length) {
            return res.status(200).json({
                message: 'incorrect password',
                status: false,
                timeStamp: timeNow,
            });
        }
    }

    const ownership = getOwnershipScope(userInfo);
    const date = new Date();
    let id_time = date.getUTCFullYear() + '' + date.getUTCMonth() + 1 + '' + date.getUTCDate();
    let id_order = Math.floor(Math.random() * (99999999999999 - 10000000000000 + 1)) + 10000000000000;

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
    let dates = new Date().getTime();
    let checkTime = timerJoin(dates);
    const [recharge] = await connection.query(`SELECT * FROM recharge WHERE ${ownership.clause} AND status = 1 And type = "upi_manual"`, ownership.params);
    const [minutes_1] = await connection.query(`SELECT * FROM minutes_1 WHERE ${ownership.clause}`, ownership.params);
    const [t_withdrawal] = await connection.query(`SELECT * FROM withdraw WHERE ${ownership.clause} AND status != 2`, ownership.params);
    const [k3_wining] = await connection.query(`select sum(k.get) as total from result_k3 k where ${ownership.clause} and k.get > 0`, ownership.params);
    console.log("k3_wining ",k3_wining);
    const [wining_5d] = await connection.query(`select sum(k.get) as total from result_5d k where ${ownership.clause} and k.get > 0`, ownership.params);
    console.log("5d_wining ",wining_5d);
    const [wingo_wining] = await connection.query(`select sum(m.get) as total from minutes_1 m where ${ownership.clause} and m.get > 0`, ownership.params);
    console.log("wingo_wining ",wingo_wining);
    const totalWining = Number(k3_wining[0].total || 0) + Number(wining_5d[0].total || 0) + Number(wingo_wining[0].total || 0);
    console.log("total wining ",totalWining);
 
    let total_recharge = 0;
    recharge.forEach((data) => {
        total_recharge += parseFloat(data.money);
    });
    let total_bet = 0;
    minutes_1.forEach((data) => {
        total_bet += parseFloat(data.money);
    });//
    let total_withdrawal = 0;
    t_withdrawal.forEach((data) => {
        total_withdrawal += parseFloat(data.money);
    });
    /**/
    
    
    
    //result = Math.max(result, 0);
    let user_bank = [];
    try {
        [user_bank] = await connection.query(`SELECT * FROM user_bank WHERE ${ownership.clause}`, ownership.params);
    } catch (error) {
        [user_bank] = await connection.query('SELECT * FROM user_bank WHERE `phone` = ?', [userInfo.phone || '__NO_PHONE__']);
    }

    const [withdraw] = await connection.query(`SELECT * FROM withdraw WHERE ${ownership.clause} AND date(today) = CURDATE()`, ownership.params);
    
    // const formattedQuery = connection.format('SELECT * FROM withdraw WHERE `phone` = ? AND date(today)  = CURDATE()', [userInfo.phone]);
    // console.log("Executing Query:", formattedQuery);
    
    
    if (user_bank.length != 0) {
        if (withdraw.length < 2) {
            if (userInfo.money - money >= 0) {
                   
                //    balance = parseFloat(total_bet)-parseFloat(total_withdrawal);
                      balance = parseFloat(total_recharge)+parseFloat(totalWining) - parseFloat(total_withdrawal);
                    
                    if (userInfo.level == 0 && (parseFloat(total_recharge) < 1 ||  money > balance)) {
                           let message='';
                           if(parseFloat(total_recharge) < 1){
                            message+='Please make your first recharge.'
                           }
                           else if(money > balance){
                            message+='Your withdrawal balance is not enough.';
                           }

                           return res.status(200).json({
                                message,
                                status: false,
                                timeStamp: timeNow,
                                balance:balance
                            });

                        
                    } else {
                        let infoBank = user_bank[0];
                        try {
                            const sql = `INSERT INTO withdraw SET id_order = ?, user_id = ?, phone = ?, money = ?, stk = ?, name_bank = ?, ifsc = ?, name_user = ?, status = ?, today = ?, time = ?`;
                            await connection.execute(sql, [id_time + '' + id_order, userInfo.id, userInfo.phone || '0', money, infoBank.stk, infoBank.name_bank, infoBank.email, infoBank.name_user, 0, checkTime, dates]);
                        } catch (error) {
                            const sql = `INSERT INTO withdraw SET id_order = ?, phone = ?, money = ?, stk = ?, name_bank = ?, ifsc = ?, name_user = ?, status = ?, today = ?, time = ?`;
                            await connection.execute(sql, [id_time + '' + id_order, userInfo.phone || '0', money, infoBank.stk, infoBank.name_bank, infoBank.email, infoBank.name_user, 0, checkTime, dates]);
                        }

                        await connection.query('UPDATE users SET money = money - ? WHERE id = ? ', [money, userInfo.id]);
                        return res.status(200).json({
                            message: 'Withdrawal successful',
                            status: true,
                            money: Number(userInfo.money || 0) - money,
                            timeStamp: timeNow,
                        });
                    }

            } else {
                return res.status(200).json({
                    message: 'Insufficient Balance',
                    status: false,
                    timeStamp: timeNow,
                });
            }
        } else {
            return res.status(200).json({
                message: 'You can only make 2 withdrawals per day',
                status: false,
                timeStamp: timeNow,
            });
        }
    } else {
        return res.status(200).json({
            message: 'Please link your bank first',
            status: false,
            timeStamp: timeNow,
        });
    }

}

const transfer = async (req, res) => {
    const sender = await getAuthenticatedUser(req);
    const amount = Number(req.body.amount || 0);
    const receiverInput = String(req.body.email || req.body.code || req.body.phone || '').trim();

    if (!sender || !receiverInput || !Number.isFinite(amount) || amount <= 0) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }

    const date = new Date();
    let id_order = Math.floor(Math.random() * (99999999999999 - 10000000000000 + 1)) + 10000000000000;
    let time = new Date().getTime();
    let client_transaction_id = id_order;
    const senderMoney = Number(sender.money || 0);
    const senderPhone = sender.phone || '0';
    const senderEmail = sender.email || null;

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

    let dates = new Date().getTime();
    let checkTime = timerJoin(dates);
    const ownership = getOwnershipScope(sender);
    const [recharge] = await connection.query(`SELECT * FROM recharge WHERE ${ownership.clause} AND status = 1`, ownership.params);
    const [minutes_1] = await connection.query(`SELECT * FROM minutes_1 WHERE ${ownership.clause}`, ownership.params);
    let total = 0;
    recharge.forEach((data) => {
        total += parseFloat(data.money);
    });
    total = total.toFixed(2);
    console.log(" recharge money ",total);
    let total2 = 0;
    minutes_1.forEach((data) => {
        total2 += parseFloat(data.money);
    });
    total2 = total2.toFixed(2);
    console.log(" minutes_1 bids money ",total2);
    // let result = 0;
    // if (total - total2 > 0) {
    //     result = total - total2;
    // }

    // if (result == 0) {
    try{
        
        if ((senderMoney >= amount && parseFloat(total2) >= amount && parseFloat(total) >= amount) || (String(sender.level) === "2" && senderMoney >= amount)) {
            let receiverRows = [];

            if (receiverInput.includes('@')) {
                [receiverRows] = await connection.query('SELECT * FROM users WHERE email = ? AND veri = 1 AND status = 1 LIMIT 1', [receiverInput]);
            }

            if (!receiverRows.length) {
                [receiverRows] = await connection.query('SELECT * FROM users WHERE code = ? AND veri = 1 AND status = 1 LIMIT 1', [receiverInput]);
            }

            if (!receiverRows.length) {
                [receiverRows] = await connection.query('SELECT * FROM users WHERE phone = ? AND veri = 1 AND status = 1 LIMIT 1', [receiverInput]);
            }

            if (receiverRows.length === 1 && Number(receiverRows[0].id) !== Number(sender.id)) {
                const receiver = receiverRows[0];
                const receiverPhone = receiver.phone || '0';

                await connection.query('UPDATE users SET money = money - ?, total_money = total_money - ? WHERE id = ?', [amount, amount, sender.id]);
                await connection.query('UPDATE users SET money = money + ?, total_money = total_money + ? WHERE id = ?', [amount, amount, receiver.id]);

                try {
                    const sql = 'INSERT INTO balance_transfer (sender_user_id, receiver_user_id, sender_phone, receiver_phone, sender_email, receiver_email, amount) VALUES (?, ?, ?, ?, ?, ?, ?)';
                    await connection.execute(sql, [sender.id, receiver.id, senderPhone, receiverPhone, senderEmail, receiver.email || null, amount]);
                } catch (error) {
                    const sql = 'INSERT INTO balance_transfer (sender_phone, receiver_phone, amount) VALUES (?, ?, ?)';
                    await connection.execute(sql, [senderPhone, receiverPhone, amount]);
                }

                try {
                    const sqlRecharge = 'INSERT INTO recharge (id_order, transaction_id, user_id, phone, money, type, status, today, url, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
                    await connection.execute(sqlRecharge, [client_transaction_id, 0, receiver.id, receiverPhone, amount, 'wallet', 1, checkTime, 0, time]);
                } catch (error) {
                    const sqlRecharge = 'INSERT INTO recharge (id_order, transaction_id, phone, money, type, status, today, url, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
                    await connection.execute(sqlRecharge, [client_transaction_id, 0, receiverPhone, amount, 'wallet', 1, checkTime, 0, time]);
                }

                return res.status(200).json({
                    message: `₹${amount} transfer successfully.`,
                    status: true,
                    timeStamp: timeNow,
                });
            } else {
                return res.status(200).json({
                    message: `${receiverInput} is not a valid user identifier`,
                    status: false,
                    timeStamp: timeNow,
                });
            }
        } else {
            return res.status(200).json({
                message: `${senderMoney < amount ? 'Your balance is not enough' : total < amount ? 'Your recharge is not enough to fulfill the request, Please recharge first.' :'The total bet is not enough to fulfill the request.'}`,
                status: false,
                timeStamp: timeNow,
            });
        }
    }
    catch(err){
        console.log(err);
        return res.status(200).json({
                message: 'something went wrong',
                status: false,
                timeStamp: timeNow,
            });
        
    }
 //   }
    // else {
    //     return res.status(200).json({
    //         message: 'The total bet is not enough to fulfill the request',
    //         status: false,
    //         timeStamp: timeNow,
    //     });
    // }
}

// get transfer balance data 
const transferHistory = async (req, res) => {
    const user = await getAuthenticatedUser(req);
    if (!user) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }

    let history = [];
    let receive = [];

    try {
        [history] = await connection.query('SELECT * FROM balance_transfer WHERE sender_user_id = ? OR sender_phone = ? ORDER BY id DESC', [user.id, user.phone || '__NO_PHONE__']);
        [receive] = await connection.query('SELECT * FROM balance_transfer WHERE receiver_user_id = ? OR receiver_phone = ? ORDER BY id DESC', [user.id, user.phone || '__NO_PHONE__']);
    } catch (error) {
        [history] = await connection.query('SELECT * FROM balance_transfer WHERE sender_phone = ? ORDER BY id DESC', [user.phone || '__NO_PHONE__']);
        [receive] = await connection.query('SELECT * FROM balance_transfer WHERE receiver_phone = ? ORDER BY id DESC', [user.phone || '__NO_PHONE__']);
    }

    if (receive.length > 0 || history.length > 0) {
        return res.status(200).json({
            message: 'Success',
            receive: receive,
            datas: history,
            status: true,
            timeStamp: timeNow,
        });
    }

    return res.status(200).json({
        message: 'Success',
        receive: [],
        datas: [],
        status: true,
        timeStamp: timeNow,
    });
}
const recharge2 = async (req, res) => {
    let auth = req.cookies.auth;
    let money = req.body.money;
    if (!auth) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        })
    }
    const userInfo = await getAuthenticatedUser(req);
    if (!userInfo) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }

    const ownership = getOwnershipScope(userInfo);
    const [recharge] = await connection.query(`SELECT * FROM recharge WHERE ${ownership.clause} AND status = ? `, [...ownership.params, 0]);
    const [bank_recharge] = await connection.query('SELECT * FROM bank_recharge');
    if (recharge.length != 0) {
        return res.status(200).json({
            message: 'Received successfully',
            datas: recharge[0],
            infoBank: bank_recharge,
            status: true,
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

const listRecharge = async (req, res) => {
    const userInfo = await getAuthenticatedUser(req);
    if (!userInfo) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }

    const ownership = getOwnershipScope(userInfo);
    const [recharge] = await connection.query(`SELECT * FROM recharge WHERE ${ownership.clause} ORDER BY id DESC`, ownership.params);
    return res.status(200).json({
        message: 'Receive success',
        datas: recharge,
        status: true,
        timeStamp: timeNow,
    });
}

const search = async (req, res) => {
    const userInfo = await getAuthenticatedUser(req);
    const identifier = String(req.body.email || req.body.phone || '').trim();

    if (!userInfo || !identifier) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }

    const byEmail = identifier.includes('@');
    const lookupSql = byEmail
        ? 'SELECT * FROM users WHERE email = ? ORDER BY id DESC'
        : 'SELECT * FROM users WHERE phone = ? ORDER BY id DESC';

    if (userInfo.level == 1) {
        const [users] = await connection.query(lookupSql, [identifier]);
        return res.status(200).json({
            message: 'Receive success',
            datas: users,
            status: true,
            timeStamp: timeNow,
        });
    } else if (userInfo.level == 2) {
        const [users] = await connection.query(lookupSql, [identifier]);
        if (users.length == 0) {
            return res.status(200).json({
                message: 'Receive success',
                datas: [],
                status: true,
                timeStamp: timeNow,
            });
        } else {
            if (users[0].ctv == userInfo.phone || users[0].ctv == userInfo.ctv) {
                return res.status(200).json({
                    message: 'Receive success',
                    datas: users,
                    status: true,
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
    } else {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
}


const listWithdraw = async (req, res) => {
    const userInfo = await getAuthenticatedUser(req);
    if (!userInfo) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }

    const ownership = getOwnershipScope(userInfo);
    const [recharge] = await connection.query(`SELECT * FROM withdraw WHERE ${ownership.clause} ORDER BY id DESC`, ownership.params);
    return res.status(200).json({
        message: 'Receive success',
        datas: recharge,
        status: true,
        timeStamp: timeNow,
    });
}

const useRedenvelope = async (req, res) => {
    let auth = req.cookies.auth;
    let code = req.body.code;
    if (!auth || !code) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        })
    }
    const [user] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `token` = ? ', [auth]);
    let userInfo = user[0];
    if (!user) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    };
    const [redenvelopes] = await connection.query(
        'SELECT * FROM redenvelopes WHERE id_redenvelope = ?', [code]);

    if (redenvelopes.length == 0) {
        return res.status(200).json({
            message: 'Redemption code error',
            status: false,
            timeStamp: timeNow,
        });
    } else {
        const [redenvelopesUsed] = await connection.query(
            'SELECT * FROM redenvelopes_used WHERE id_redenvelops = ? and phone_used = ?', [code,userInfo.phone]);
        let infoRe = redenvelopes[0];
        const d = new Date();
        const time = d.getTime();
        if (infoRe.status == 0 && redenvelopesUsed.length === 0) {
            let money = parseFloat(infoRe.money/infoRe.used);
            let count = infoRe.used_count+1;
            await connection.query('UPDATE redenvelopes SET used_count = ?, status = ? WHERE `id_redenvelope` = ? ', [count,count == infoRe.used ? 1:0,infoRe.id_redenvelope]);
            await connection.query('UPDATE users SET money = money + ? WHERE `phone` = ? ', [money, userInfo.phone]);
            let sql = 'INSERT INTO redenvelopes_used SET phone = ?, phone_used = ?, id_redenvelops = ?, money = ?, `time` = ? ';
            await connection.query(sql, [infoRe.phone, userInfo.phone, infoRe.id_redenvelope, money, time]);
            return res.status(200).json({
                message: `Received successfully +${money}`,
                status: true,
                timeStamp: timeNow,
            });
        } else {
            return res.status(200).json({
                message: 'Gift code already used',
                status: false,
                timeStamp: timeNow,
            });
        }
    }
}

const callback_bank = async (req, res) => {
    let transaction_id = req.body.transaction_id;
    let client_transaction_id = req.body.client_transaction_id;
    let amount = req.body.amount;
    let requested_datetime = req.body.requested_datetime;
    let expired_datetime = req.body.expired_datetime;
    let payment_datetime = req.body.payment_datetime;
    let status = req.body.status;
    if (!transaction_id) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        })
    }
    if (status == 2) {
        await connection.query(`UPDATE recharge SET status = 1 WHERE id_order = ?`, [client_transaction_id]);
        const [info] = await connection.query(`SELECT * FROM recharge WHERE id_order = ?`, [client_transaction_id]);
        await connection.query('UPDATE users SET money = money + ?, total_money = total_money + ? WHERE phone = ? ', [info[0].money, info[0].money, info[0].phone]);
        return res.status(200).json({
            message: 0,
            status: true,
        });
    } else {
        await connection.query(`UPDATE recharge SET status = 2 WHERE id = ?`, [id]);

        return res.status(200).json({
            message: 'Cancellation successful',
            status: true,
            datas: recharge,
        });
    }
}


const confirmRecharge = async (req, res) => {
    let auth = req.cookies.auth;
    //let money = req.body.money;
    //let paymentUrl = req.body.payment_url;
    let client_txn_id = req.body?.client_txn_id;

    if (!client_txn_id) {
        return res.status(200).json({
            message: 'client_txn_id is required',
            status: false,
            timeStamp: timeNow,
        })
    }

    if (!auth) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        })
    }

    const [user] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `token` = ? ', [auth]);
    let userInfo = user[0];

    if (!user) {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    };

    const [recharge] = await connection.query('SELECT * FROM recharge WHERE phone = ? AND status = ? ', [userInfo.phone, 0]);

    if (recharge.length != 0) {
        const rechargeData = recharge[0];
        const date = new Date(rechargeData.today);
        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const yyyy = date.getFullYear();
        const formattedDate = `${dd}-${mm}-${yyyy}`;
        const apiData = {
            key: "0c79da69-fdc1-4a07-a8b4-7135a0168385",
            client_txn_id: client_txn_id,
            txn_date: formattedDate,
        };
        try {
            const apiResponse = await axios.post('https://api.ekqr.in/api/check_order_status', apiData);
            console.log(apiResponse.data)
            const apiRecord = apiResponse.data.data;
            if (apiRecord.status === "scanning") {
                return res.status(200).json({
                    message: 'Waiting for confirmation',
                    status: false,
                    timeStamp: timeNow,
                });
            }
            if (apiRecord.client_txn_id === rechargeData.id_order && apiRecord.customer_mobile === rechargeData.phone && apiRecord.amount === rechargeData.money) {
                if (apiRecord.status === 'success') {
                    await connection.query(`UPDATE recharge SET status = 1 WHERE id = ? AND id_order = ? AND phone = ? AND money = ?`, [rechargeData.id, apiRecord.client_txn_id, apiRecord.customer_mobile, apiRecord.amount]);
                    // const [code] = await connection.query(`SELECT invite, total_money from users WHERE phone = ?`, [apiRecord.customer_mobile]);
                    // const [data] = await connection.query('SELECT recharge_bonus_2, recharge_bonus FROM admin WHERE id = 1');
                    // let selfBonus = info[0].money * (data[0].recharge_bonus_2 / 100);
                    // let money = info[0].money + selfBonus;
                    let money = apiRecord.amount;
                    await connection.query('UPDATE users SET money = money + ?, total_money = total_money + ? WHERE phone = ? ', [money, money, apiRecord.customer_mobile]);
                    // let rechargeBonus;
                    // if (code[0].total_money <= 0) {
                    //     rechargeBonus = apiRecord.customer_mobile * (data[0].recharge_bonus / 100);
                    // }
                    // else {
                    //     rechargeBonus = apiRecord.customer_mobile * (data[0].recharge_bonus_2 / 100);
                    // }
                    // const percent = rechargeBonus;
                    // await connection.query('UPDATE users SET money = money + ?, total_money = total_money + ? WHERE code = ?', [money, money, code[0].invite]);

                    return res.status(200).json({
                        message: 'Successful application confirmation',
                        status: true,
                        datas: recharge,
                    });
                } else if (apiRecord.status === 'failure' || apiRecord.status === 'close') {
                    console.log(apiRecord.status)
                    await connection.query(`UPDATE recharge SET status = 2 WHERE id = ? AND id_order = ? AND phone = ? AND money = ?`, [rechargeData.id, apiRecord.client_txn_id, apiRecord.customer_mobile, apiRecord.amount]);
                    return res.status(200).json({
                        message: 'Payment failure',
                        status: true,
                        timeStamp: timeNow,
                    });
                }
            } else {

                return res.status(200).json({
                    message: 'Mismtach data',
                    status: true,
                    timeStamp: timeNow,
                });
            }
        } catch (error) {
            console.error(error);
        }
    } else {
        return res.status(200).json({
            message: 'Failed',
            status: false,
            timeStamp: timeNow,
        });
    }
}

const confirmUSDTRecharge = async (req, res) => {
    console.log(res?.body)
    console.log(res?.query)
    console.log(res?.cookies)
    // let auth = req.cookies.auth;
    // //let money = req.body.money;
    // //let paymentUrl = req.body.payment_url;
    // let client_txn_id = req.body?.client_txn_id;

    // if (!client_txn_id) {
    //     return res.status(200).json({
    //         message: 'client_txn_id is required',
    //         status: false,
    //         timeStamp: timeNow,
    //     })
    // }

    // if (!auth) {
    //     return res.status(200).json({
    //         message: 'Failed',
    //         status: false,
    //         timeStamp: timeNow,
    //     })
    // }

    // const [user] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `token` = ? ', [auth]);
    // let userInfo = user[0];

    // if (!user) {
    //     return res.status(200).json({
    //         message: 'Failed',
    //         status: false,
    //         timeStamp: timeNow,
    //     });
    // };

    // const [recharge] = await connection.query('SELECT * FROM recharge WHERE phone = ? AND status = ? ', [userInfo.phone, 0]);

    // if (recharge.length != 0) {
    //     const rechargeData = recharge[0];
    //     const date = new Date(rechargeData.today);
    //     const dd = String(date.getDate()).padStart(2, '0');
    //     const mm = String(date.getMonth() + 1).padStart(2, '0');
    //     const yyyy = date.getFullYear();
    //     const formattedDate = `${dd}-${mm}-${yyyy}`;
    //     const apiData = {
    //         key: process.env.PAYMENT_KEY,
    //         client_txn_id: client_txn_id,
    //         txn_date: formattedDate,
    //     };
    //     try {
    //         const apiResponse = await axios.post('https://api.ekqr.in/api/check_order_status', apiData);
    //         const apiRecord = apiResponse.data.data;
    //         if (apiRecord.status === "scanning") {
    //             return res.status(200).json({
    //                 message: 'Waiting for confirmation',
    //                 status: false,
    //                 timeStamp: timeNow,
    //             });
    //         }
    //         if (apiRecord.client_txn_id === rechargeData.id_order && apiRecord.customer_mobile === rechargeData.phone && apiRecord.amount === rechargeData.money) {
    //             if (apiRecord.status === 'success') {
    //                 await connection.query(`UPDATE recharge SET status = 1 WHERE id = ? AND id_order = ? AND phone = ? AND money = ?`, [rechargeData.id, apiRecord.client_txn_id, apiRecord.customer_mobile, apiRecord.amount]);
    //                 // const [code] = await connection.query(`SELECT invite, total_money from users WHERE phone = ?`, [apiRecord.customer_mobile]);
    //                 // const [data] = await connection.query('SELECT recharge_bonus_2, recharge_bonus FROM admin WHERE id = 1');
    //                 // let selfBonus = info[0].money * (data[0].recharge_bonus_2 / 100);
    //                 // let money = info[0].money + selfBonus;
    //                 let money = apiRecord.amount;
    //                 await connection.query('UPDATE users SET money = money + ?, total_money = total_money + ? WHERE phone = ? ', [money, money, apiRecord.customer_mobile]);
    //                 // let rechargeBonus;
    //                 // if (code[0].total_money <= 0) {
    //                 //     rechargeBonus = apiRecord.customer_mobile * (data[0].recharge_bonus / 100);
    //                 // }
    //                 // else {
    //                 //     rechargeBonus = apiRecord.customer_mobile * (data[0].recharge_bonus_2 / 100);
    //                 // }
    //                 // const percent = rechargeBonus;
    //                 // await connection.query('UPDATE users SET money = money + ?, total_money = total_money + ? WHERE code = ?', [money, money, code[0].invite]);

    //                 return res.status(200).json({
    //                     message: 'Successful application confirmation',
    //                     status: true,
    //                     datas: recharge,
    //                 });
    //             } else if (apiRecord.status === 'failure' || apiRecord.status === 'close') {
    //                 console.log(apiRecord.status)
    //                 await connection.query(`UPDATE recharge SET status = 2 WHERE id = ? AND id_order = ? AND phone = ? AND money = ?`, [rechargeData.id, apiRecord.client_txn_id, apiRecord.customer_mobile, apiRecord.amount]);
    //                 return res.status(200).json({
    //                     message: 'Payment failure',
    //                     status: true,
    //                     timeStamp: timeNow,
    //                 });
    //             }
    //         } else {
    //             return res.status(200).json({
    //                 message: 'Mismtach data',
    //                 status: true,
    //                 timeStamp: timeNow,
    //             });
    //         }
    //     } catch (error) {
    //         console.error(error);
    //     }
    // } else {
    //     return res.status(200).json({
    //         message: 'Failed',
    //         status: false,
    //         timeStamp: timeNow,
    //     });
    // }
}



const updateRecharge = async (req, res) => {
    let auth = req.cookies.auth;
    let money = req.body.money;
    let order_id = req.body.id_order;
    let data = req.body.inputData;

    // if (type != 'upi') {
    //     if (!auth || !money || money < 300) {
    //         return res.status(200).json({
    //             message: 'upi failed',
    //             status: false,
    //             timeStamp: timeNow,
    //         })
    //     }
    // }
    const [user] = await connection.query('SELECT `phone`, `code`,`invite` FROM users WHERE `token` = ? ', [auth]);
    let userInfo = user[0];
    if (!user) {
        return res.status(200).json({
            message: 'user not found',
            status: false,
            timeStamp: timeNow,
        });
    };
    const [utr] = await connection.query('SELECT * FROM recharge WHERE `utr` = ? ', [data]);
    let utrInfo = utr[0];

    if (!utrInfo) {
        await connection.query('UPDATE recharge SET utr = ? WHERE phone = ? AND id_order = ?', [data, userInfo.phone, order_id]);
        return res.status(200).json({
            message: 'UTR updated',
            status: true,
            timeStamp: timeNow,
        });
    } else {
        return res.status(200).json({
            message: 'UTR is already in use',
            status: false,
            timeStamp: timeNow,
        });
    }


}

const getInvitationData = async (req,res) => {
    try{
        let auth = req.cookies.auth;
        const [user] = await connection.query('SELECT `id`, `code` FROM users WHERE `token` = ? AND veri = 1 AND status = 1 LIMIT 1', [auth]);
        if(user.length > 0){
        let userInfo = user[0];
        const [invitationList] = await connection.query(
            `SELECT u.id as user_id, u.email, u.phone, u.code, sum(IFNULL(r.money,0)) as money, MAX(r.type) as type
             FROM users u
             LEFT JOIN recharge r
               ON (r.user_id = u.id OR (r.user_id IS NULL AND u.phone IS NOT NULL AND u.phone <> '' AND u.phone <> '0' AND r.phone = u.phone))
              AND (r.type='upi_manual' OR r.type IS NULL)
              AND (r.status=1 OR r.status IS NULL)
             WHERE u.invite = ?
             GROUP BY u.id, u.email, u.phone, u.code`,
            [userInfo.code]
        );
        let invitation={count:0,deposit:0};
        for(let i of invitationList){
            invitation['count']+=1;
            if(i.money >=500){
                invitation['deposit']+=1;
            }
        }
        res.status(200).json({
            message: `Inviatation List`,
            status: true,
            data:invitationList,
            invitation
        })
        }
        else{
            sendStatus(res,'User does not exist.');
        }
    }
    catch(err){
        console.log("err ",err)
        sendStatus(res,'Something went wrong!');
    }
}

const getRebate = async (req,res) => {
try{
    let auth = req.cookies.auth;
    const [user] = await connection.query('SELECT `id`, `phone` FROM users WHERE `token` = ? AND veri = 1 AND status = 1 LIMIT 1', [auth]);
    console.log("user ",user);
    if(user.length > 0){
        let userInfo = user[0];
        const ownership = getOwnershipScope(userInfo);
        const [totalBat] = await connection.query(`SELECT sum(money) as total FROM minutes_1 WHERE ${ownership.clause}`, ownership.params);
        console.log('total ',totalBat);
        const total = totalBat[0].total ? totalBat[0].total : 0; 
        const [todayBat] = await connection.query(`SELECT sum(money) as money FROM minutes_1 WHERE ${ownership.clause} and DATE_FORMAT(today, "%Y-%m-%d") = CURDATE()`, ownership.params);
        console.log('today ',todayBat);
        const today = todayBat[0].money ? todayBat[0].money : 0;
        console.log((total*0.05)/100);
        console.log((today*0.05)/100);
        const rebets={};
        rebets['total'] = ((total*0.05)/100).toFixed(2);
        rebets['today'] = ((today*0.05)/100).toFixed(2);
        res.status(200).json({
            message: `Rebats Data`,
            data:rebets,
            status: true,
        });
    }
    else{
        sendStatus(res,'User does not exist.')
    }
}
catch(err){
 sendStatus(res,'Something went wrong!')
}
}

const transferRebate = async (req,res) => {
    let connection1 =  await connection.getConnection();
    try{
        await connection1.beginTransaction();
        let auth = req.cookies.auth;
        const { rebateMoney } = req.body
        const [user] = await connection1.query('SELECT `id`, `phone` FROM users WHERE `token` = ? AND veri = 1 AND status = 1 LIMIT 1', [auth]);
        console.log("user ",user);
        if(user.length > 0){
            let userInfo = user[0];
            let todayRebate = [];
            try {
                [todayRebate] = await connection1.query('SELECT * FROM rebate WHERE user_id = ? and DATE_FORMAT(time, "%Y-%m-%d") = CURDATE()', [userInfo.id]);
            } catch (error) {
                [todayRebate] = await connection1.query('SELECT * FROM rebate WHERE phone = ? and DATE_FORMAT(time, "%Y-%m-%d") = CURDATE()', [userInfo.phone || '__NO_PHONE__']);
            }
            if(todayRebate.length == 0){
                let time = new Date().getTime();
                let timeNow = timerJoin(new Date().getTime());
                let id_order =
                  Math.floor(
                    Math.random() * (99999999999999 - 10000000000000 + 1)
                  ) + 10000000000000;
                                try {
                                        const sql_recharge =
                                            "INSERT INTO recharge (id_order, transaction_id, user_id, phone, money, type, status, today, url, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                                        await connection1.execute(sql_recharge, [
                                            id_order,
                                            0,
                                            userInfo.id,
                                            userInfo.phone || '0',
                                            rebateMoney,
                                            "Rebate Money ",
                                            1,
                                            timeNow,
                                            0,
                                            time,
                                        ]);
                                } catch (error) {
                                        const sql_recharge =
                                            "INSERT INTO recharge (id_order, transaction_id, phone, money, type, status, today, url, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
                                        await connection1.execute(sql_recharge, [
                                            id_order,
                                            0,
                                            userInfo.phone || '0',
                                            rebateMoney,
                                            "Rebate Money ",
                                            1,
                                            timeNow,
                                            0,
                                            time,
                                        ]);
                                }

                                await connection1.query(
                                    "UPDATE users SET money = money + ?, total_money = total_money + ? WHERE `id` = ?",
                                    [rebateMoney, rebateMoney, userInfo.id]
                                );

                                const ownership = getOwnershipScope(userInfo);
                                const [todayBet] = await connection1.query(`SELECT sum(money) as money FROM minutes_1 WHERE ${ownership.clause} and DATE_FORMAT(today, "%Y-%m-%d") = CURDATE()`, ownership.params);

                                try {
                                        await connection1.query('Insert Into rebate set user_id = ?, phone = ?, bets = ?, money = ?, time = ?',[userInfo.id, userInfo.phone || '0', todayBet[0].money || 0, rebateMoney, timeNow]);
                                } catch (error) {
                                        await connection1.query('Insert Into rebate set phone = ?, bets = ?, money = ?, time = ?',[userInfo.phone || '0', todayBet[0].money || 0, rebateMoney, timeNow]);
                                }
                await connection1.commit();
                return res.status(200).json({
                    message: "Rebate Transfer Successfull",
                    status: true,
                });
            }
            else{
                await connection1.rollback();
                sendStatus(res,'Already claimed  today rebate.')
            }
        }
        else{
            await connection1.rollback();
            sendStatus(res,'User does not exist.')
        }
    }
    catch(err){
        console.log("err ",err);
        await connection1.rollback();
        sendStatus(res,'Something went wrong!')
    }
    finally{
         await connection1.release();
    }
}

const getRebateHistory = async (req,res) => {
    try{
        let auth = req.cookies.auth;
        const [user] = await connection.query('SELECT `id`, `phone` FROM users WHERE `token` = ? AND veri = 1 AND status = 1 LIMIT 1', [auth]);
        console.log("user ",user);
        if(user.length > 0){
            let userInfo = user[0];
            let rebateList = [];
            try {
                [rebateList] = await connection.query('SELECT * FROM rebate WHERE user_id = ? ORDER BY id DESC', [userInfo.id]);
            } catch (error) {
                [rebateList] = await connection.query('SELECT * FROM rebate WHERE `phone` = ? ORDER BY id DESC', [userInfo.phone || '__NO_PHONE__']);
            }
            res.status(200).json({
                message: `Rebats Data`,
                data:rebateList,
                status: true,
            });
        }
        else{
            sendStatus(res,'User does not exist.')
        }
    }
    catch(err){
     sendStatus(res,'Something went wrong!')
    }
    }

module.exports = {
    userInfo,
    changeUser,
    promotion,
    myTeam,
    wowpay,
    recharge,
    recharge2,
    listRecharge,
    listWithdraw,
    changePassword,
    checkInHandling,
    infoUserBank,
    addBank,
    withdrawal3,
    transfer,
    transferHistory,
    callback_bank,
    listMyTeam,
    verifyCode,
    aviator,
    useRedenvelope,
    search,
    updateRecharge,
    confirmRecharge,
    cancelRecharge,
    confirmUSDTRecharge,
    getInvitationData,
    getRebate,
    transferRebate,
    getRebateHistory,
    timerJoin
}