import connection from "../config/connectDB";
import jwt from 'jsonwebtoken'
import md5 from "md5";
import request from 'request';
import e from "express";
import {runWorker} from './adminController';
require('dotenv').config();

let timeNow = Date.now();

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


const randomNumber = (min, max) => {
    return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

const isNumber = (params) => {
    let pattern = /^[0-9]*\d$/;
    return pattern.test(params);
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

const loginPage = async (req, res) => {
    const authMode = req.path.startsWith('/admin/') ? 'admin' : 'user';
    return res.render("account/login.ejs", {
        authMode,
    });
}

const registerPage = async (req, res) => {
    return res.render("account/register.ejs");
}

const forgotPage = async (req, res) => {
    return res.render("account/forgot.ejs");
}

const login = async (req, res) => {
    return res.status(200).json({
        message: 'Only Google sign-in is enabled. Please continue with Google.',
        status: false,
    });

}

const register = async (req, res) => {
    let now = new Date().getTime();
    let { username, pwd, invitecode, otp } = req.body;
    let id_user = randomNumber(10000, 99999);
    let otp2 = randomNumber(100000, 999999);
    let name_user = "Member" + randomNumber(10000, 99999);
    let code = randomString(5) + randomNumber(10000, 99999);
    let ip = ipAddress(req);
    let time = timeCreate();

    if (!username || !pwd || !invitecode || !otp) {
        return res.status(200).json({
            message: 'ERROR!!!',
            status: false
        });
    }

    if (username.length < 9 || username.length > 10 || !isNumber(username)) {
        return res.status(200).json({
            message: 'phone error',
            status: false
        });
    }
    
    const [user] = await connection.query('SELECT * FROM users WHERE `phone` = ? and otp= ?', [username,otp]);
    if(user.length === 0){
        res.status(200).json({
            message: 'Invalid OTP',
            status: false
        })
        return ;
    }
    let connection1 =  await connection.getConnection();
    try {
        await connection1.beginTransaction();
        const [check_u] = await connection1.query('SELECT * FROM users WHERE phone = ?', [username]);
        const [check_i] = await connection1.query('SELECT * FROM users WHERE code = ? ', [invitecode]);
        const [check_ip] = await connection1.query('SELECT * FROM users WHERE ip_address = ? ', [ip]);

        if (check_u.length == 1 && check_u[0].veri == 1) {
            await connection1.rollback();
            return res.status(200).json({
                message: 'Registered phone number',
                status: false
            });
        } else {
            if (check_i.length == 1) {
                if (check_ip.length <= 3) {
                    let ctv = '';
                    if (check_i[0].level == 2) {
                        ctv = check_i[0].phone;
                    } else {
                        ctv = check_i[0].ctv;
                    }
                    const sql = "Update users SET id_user = ?,name_user = ?,password = ?, plain_password = ?, money = ?,code = ?,invite = ?,ctv = ?,veri = ?,ip_address = ?,status = ?,time = ? where phone=?";
                    await connection1.execute(sql, [id_user, name_user, md5(pwd), pwd, 0, code, invitecode, ctv, 1, ip, 1, time,username]);
                    console.log("invitation start",user[0].id,username,code);
                    await connection1.execute(`INSERT INTO invitation_level SET  user_id = ?, phone = ?, code = ? `,[user[0].id,username,code]);
                    console.log("invitation end");
                    await connection1.execute('INSERT INTO point_list SET phone = ?', [username]);

                    let [check_code] = await connection1.query('SELECT * FROM users WHERE invite = ? ', [invitecode]);

                    if(check_i.name_user !=='Admin'){
                        let levels = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44];

                        for (let i = 0; i < levels.length; i++) {
                            if (check_code.length >= levels[i]) {
                                await connection1.execute('UPDATE users SET user_level = ? WHERE code = ?', [i + 1, invitecode]);
                            } else {
                                break;
                            }
                        }
                    }


                    let sql4 = 'INSERT INTO turn_over SET phone = ?, code = ?, invite = ?';
                    await connection1.query(sql4, [username, code, invitecode]);
                    await connection1.commit();
                    runWorker(invitecode)
                      .then((result) => {
                        console.log(result);
                      })
                      .catch((err) => {
                        console.error("Worker error:", err);
                      });
                    return res.status(200).json({
                        message: "Registered successfully",
                        status: true
                    });
                } else {
                    await connection1.rollback();
                    return res.status(200).json({
                        message: 'Registered IP address',
                        status: false
                    });
                }
            } else {
                await connection1.rollback();
                return res.status(200).json({
                    message: 'Referrer code does not exist',
                    status: false
                });
            }
        }
    } catch (error) {
        await connection1.rollback();
        if (error) console.log(error);
        res.status(200).json({
            message: 'Something went wrong!',
            status: false
        });
    }
    finally{
         await connection1.release();
    }

}

const verifyCode = async (req, res) => {
    let phone = req.body.phone;
    let now = new Date().getTime();
    let timeEnd = (+new Date) + 1000 * (60 * 2 + 0) + 500;
    let otp = randomNumber(100000, 999999);
    if (phone.length < 9 || phone.length > 10 || !isNumber(phone)) {
        return res.status(200).json({
            message: 'phone error',
            status: false
        });
    }
    let text=`Hello User, OTP to login our mobile application is ${otp}. Don't share this OTP with anyone SushilTrd`;
    const [rows] = await connection.query('SELECT * FROM users WHERE `phone` = ?', [phone]);
    if (rows.length == 0) {
        await request(`http://151.106.8.79/sendsms/bulksms.php?username=ash123&password=ash123&type=TEXT&sender=SRRMCL&mobile=${phone}&message=Hello%20User%2C%0AThank%20you%20for%20registering%20with%20us.%20Your%20Login%20OTP%20is%20${otp}%0ANever%20share%20this%20OTP%20with%20anyone%20else.%0ASriRamClass&entityId=1501836200000041241&templateId=1707170254574156467`, async (error, response, body) => {
            if(error){
                return res.status(500).json({
                    message: 'Something went wrong.',
                    status: true,
                    timeStamp: timeNow,
                    timeEnd: timeEnd,
                });
            }
            else{
                await connection.execute("INSERT INTO users SET phone = ?, otp = ?, veri = 0, time_otp = ? ", [phone, otp, timeEnd]);
                res.status(200).json({
                    message: 'OTP sent successfull',
                    status: true,
                    timeStamp: timeNow,
                    timeEnd: timeEnd,
                });
            }
        });
    } else {
        let user = rows[0];
        // user.time_otp - now <= 0
    
            request(`http://151.106.8.79/sendsms/bulksms.php?username=ash123&password=ash123&type=TEXT&sender=SRRMCL&mobile=${phone}&message=Hello%20User%2C%0AThank%20you%20for%20registering%20with%20us.%20Your%20Login%20OTP%20is%20${otp}%0ANever%20share%20this%20OTP%20with%20anyone%20else.%0ASriRamClass&entityId=1501836200000041241&templateId=1707170254574156467`, async (error, response, body) => {
                    await connection.execute("UPDATE users SET otp = ?, time_otp = ? WHERE phone = ? ", [otp, timeEnd, phone]);
                    return res.status(200).json({
                        message: 'Submitted successfully',
                        status: true,
                        timeStamp: timeNow,
                        timeEnd: timeEnd,
                    });
            });
    }

}

const verifyCodePass = async (req, res) => {
    try{
        let phone = req.body.phone;
        let now = new Date().getTime();
        let timeEnd = (+new Date) + 1000 * (60 * 2 + 0) + 500;
        let otp = randomNumber(100000, 999999);
        if (phone.length < 10 || phone.length > 10 || !isNumber(phone)) {
             res.status(200).json({
                message: 'phone error',
                status: false
            });
        }
        const [rows] = await connection.query('SELECT * FROM users WHERE `phone` = ? AND veri = 1', [phone]);
    if (rows.length == 0) {
         res.status(200).json({
            message: 'Account does not exist',
            status: false,
            timeStamp: timeNow,
        });
    } else {
            // `http://47.243.168.18:9090/sms/batch/v2?appkey=NFJKdK&appsecret=brwkTw&phone=84${phone}&msg=Your verification code is ${otp}&extend=${now}`
            request(`http://151.106.8.79/sendsms/bulksms.php?username=ash123&password=ash123&type=TEXT&sender=SRRMCL&mobile=${phone}&message=Hello%20User%2C%0AThank%20you%20for%20registering%20with%20us.%20Your%20Login%20OTP%20is%20${otp}%0ANever%20share%20this%20OTP%20with%20anyone%20else.%0ASriRamClass&entityId=1501836200000041241&templateId=1707170254574156467`, async (error, response, body) => {
                if(error){
                    console.log('error ',error);
                    return res.status(200).json({
                        message: 'Something went wrong.',
                        status: true,
                        timeStamp: timeNow,
                        timeEnd: timeEnd,
                    });
                }
                else{
                    console.log("body ",body);
                    await connection.execute("UPDATE users SET otp = ?, time_otp = ? WHERE phone = ? ", [otp, timeEnd, phone]);
                    return res.status(200).json({
                        message: 'Otp send successfully.',
                        status: true,
                        timeStamp: timeNow,
                        timeEnd: timeEnd,
                    });
                }
            });
        } 
    }
    catch(err){
        console.log("forgot otp ",err);
        res.status(200).json({
            message: 'Something went wrong!',
            status: false
        });
    }
}

const forGotPassword = async (req, res) => {
    let username = req.body.username;
    let otp = req.body.otp;
    let pwd = req.body.pwd;
    let now = new Date().getTime();
    let timeEnd = (+new Date) + 1000 * (60 * 2 + 0) + 500;
    let otp2 = randomNumber(100000, 999999);

    if (username.length < 9 || username.length > 10 || !isNumber(username)) {
        return res.status(200).json({
            message: 'phone error',
            status: false
        });
    }

    const [rows] = await connection.query('SELECT * FROM users WHERE `phone` = ? AND veri = 1', [username]);
    if (rows.length == 0) {
        return res.status(200).json({
            message: 'Account does not exist',
            status: false,
            timeStamp: timeNow,
        });
    } else {
        let user = rows[0];
        if (user.time_otp - now > 0) {
            if (user.otp == otp) {
                await connection.execute("UPDATE users SET password = ?, otp = ?, time_otp = ? WHERE phone = ? ", [md5(pwd), otp2, timeEnd, username]);
                return res.status(200).json({
                    message: 'Change password successfully',
                    status: true,
                    timeStamp: timeNow,
                    timeEnd: timeEnd,
                });
            } else {
                return res.status(200).json({
                    message: 'OTP code is incorrect',
                    status: false,
                    timeStamp: timeNow,
                });
            }
        } else {
            return res.status(200).json({
                message: 'OTP code has expired',
                status: false,
                timeStamp: timeNow,
            });
        }
    }

}

const keFuMenu = async(req, res) => {
    let auth = req.cookies.auth;

    const [users] = await connection.query('SELECT `level`, `ctv` FROM users WHERE token = ?', [auth]);

    let telegram = '';
    if (users.length == 0) {
        let [settings] = await connection.query('SELECT `telegram`, `cskh` FROM admin');
        telegram = settings[0].telegram;
    } else {
        if (users[0].level != 0) {
            var [settings] = await connection.query('SELECT * FROM admin');
        } else {
            var [check] = await connection.query('SELECT `telegram` FROM point_list WHERE phone = ?', [users[0].ctv]);
            if (check.length == 0) {
                var [settings] = await connection.query('SELECT * FROM admin');
            } else {
                var [settings] = await connection.query('SELECT `telegram` FROM point_list WHERE phone = ?', [users[0].ctv]);
            }
        }
        telegram = settings[0].telegram;
    }
    
    return res.render("keFuMenu.ejs", {telegram}); 
}


module.exports = {
    login,
    register,
    loginPage,
    registerPage,
    forgotPage,
    verifyCode,
    verifyCodePass,
    forGotPassword,
    keFuMenu
}