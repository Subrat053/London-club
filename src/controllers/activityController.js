require('dotenv').config();
import connection from "../config/connectDB";
import { timerJoin } from './userController';
import { getUserFromAuthToken, buildOwnershipWhereClause } from '../services/sessionService';


const dailyAmount={'500':5,'5000':40,'10000':100,'50000':500,'100000':1000}
const sendStatus = (res,message) => {
  return res.status(200).json({message,status:false});
}
const getTodayBat = async (req,res) => {
    try{
        let auth = req.cookies.auth;
        const userInfo = await getUserFromAuthToken(auth, { requireActive: true });
        if(userInfo){
        const ownership = buildOwnershipWhereClause(userInfo);
        const [totalBat] = await connection.query(`SELECT sum(money) as money FROM minutes_1 WHERE ${ownership.clause} and DATE_FORMAT(today, "%Y-%m-%d") = CURDATE()`, ownership.params);
        const [weekBat] =  await connection.query(`SELECT sum(money) as weekBat FROM minutes_1 WHERE ${ownership.clause} and YEARWEEK(today, 0) = YEARWEEK(CURDATE(),0)`, ownership.params);
        const [weeklyRewards] = await connection.query(`SELECT bat FROM activity_rewards WHERE ${ownership.clause} and type = "weekly" and YEARWEEK(time, 0) = YEARWEEK(CURDATE(),0)`, ownership.params);
        const [dailyRewards] = await connection.query(`SELECT bat FROM activity_rewards WHERE ${ownership.clause} and type = "daily" and DATE_FORMAT(time, "%Y-%m-%d") = CURDATE()`, ownership.params);
        console.log(weeklyRewards,dailyRewards);
        res.status(200).json({
            message: `Today Total bets`,
            status: true,
            data:{...totalBat[0],...weekBat[0],daily:dailyRewards.map(data => data.bat),weekly:weeklyRewards.map(data => data.bat)}
        });
      }
      else{
        sendStatus(res,'User does not exist.');
      }
    }
    catch(err){
        console.log("err ",JSON.stringify(err));
        sendStatus(res,'Something went wrong!');
    }
}

const getActivityReward = async (req,res) => {
    let connection1 =  await connection.getConnection();
    try{
        await connection1.beginTransaction();
        let auth = req.cookies.auth;
        const { type, rewardBat } = req.body;
        const [user] = await connection1.query('SELECT `id`,`phone`,`money`,`total_money` FROM users WHERE `token` = ? AND veri = 1 AND status = 1 LIMIT 1', [auth]);
        let timeNow= timerJoin((new Date()).getTime());
        if(user.length > 0){
            let userInfo = user[0];
            const ownership = buildOwnershipWhereClause(userInfo);
            let id_order =
            Math.floor(
              Math.random() *
                (99999999999999 - 10000000000000 + 1)
            ) + 10000000000000;
          let time = new Date().getTime();
            if(type === 'weekly'){
                const [activity] = await connection1.query(`SELECT * FROM activity_rewards WHERE ${ownership.clause} and type="weekly" and YEARWEEK(time, 0) = YEARWEEK(CURDATE(),0)`, ownership.params);
                console.log("activity ",activity);
                if(activity.length === 0){
                    const [weekBat] =  await connection1.query(`SELECT sum(money) as bat FROM minutes_1 WHERE ${ownership.clause} and YEARWEEK(today, 0) = YEARWEEK(CURDATE(),0)`, ownership.params);
                    console.log("bet ",weekBat[0]);
                    if(parseInt(weekBat[0].bat) >= 50000){
                        const sql = `INSERT INTO activity_rewards SET user_id = ?,phone = ?,bat = ?,money = ?,type = ?,time = ?`;
                        await connection1.execute(sql, [userInfo.id, userInfo.phone || '0',50000,100,type,timeNow]);
                        try {
                            const sql_recharge = "INSERT INTO recharge (id_order, transaction_id, user_id, phone, money, type, status, today, url, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                            await connection1.execute(sql_recharge, [id_order, 0, userInfo.id, userInfo.phone || '0', 100, 'Weekly Acivity Bonus', 1, timeNow, 0, time]);
                        } catch (error) {
                            const sql_recharge = "INSERT INTO recharge (id_order, transaction_id, phone, money, type, status, today, url, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
                            await connection1.execute(sql_recharge, [id_order, 0, userInfo.phone || '0', 100, 'Weekly Acivity Bonus', 1, timeNow, 0, time]);
                        }
                        let totalMoney = parseFloat(userInfo.total_money)+100;
                        let userMoney = parseFloat(userInfo.money)+100;
                        await connection1.query('UPDATE users SET money = ?,total_money=? WHERE id = ?', [userMoney,totalMoney,userInfo.id]);
                        await connection1.commit();
                        res.status(200).json({
                            message: `Weekly Reward claim successfull`,
                            status:true
                        })
                    }
                    else{
                        sendStatus(res,'Bets not enough to claim weekly Award.')
                    }
                }
                else{
                    sendStatus(res,'Already claimed weekly Award.')
                }
               
            }
            else if(type === 'daily'){
                const [activity] = await connection1.query(`SELECT * FROM activity_rewards WHERE ${ownership.clause} and bat = ? and type="daily" and DATE_FORMAT(time, "%Y-%m-%d") = CURDATE()`, [...ownership.params, rewardBat]);
                console.log("actiity ",activity);
                if(activity.length === 0){
                    const [dailyBat] = await connection1.query(`SELECT sum(money) as bat FROM minutes_1 WHERE ${ownership.clause} and DATE_FORMAT(today, "%Y-%m-%d") = CURDATE()`, ownership.params);
                    console.log("bat ",dailyBat[0]);
                    if(parseInt(dailyBat[0].bat) >= rewardBat){
                        let amount = dailyAmount[rewardBat.toString()];
                        const sql = `INSERT INTO activity_rewards SET user_id = ?,phone = ?,bat = ?,money = ?,type = ?,time = ?`;
                        await connection1.execute(sql, [userInfo.id, userInfo.phone || '0',rewardBat,amount,type,timeNow]);
                        try {
                            const sql_recharge = "INSERT INTO recharge (id_order, transaction_id, user_id, phone, money, type, status, today, url, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                            await connection1.execute(sql_recharge, [id_order, 0, userInfo.id, userInfo.phone || '0', amount,'Daily Acivity Bonus '+amount, 1, timeNow, 0, time]);
                        } catch (error) {
                            const sql_recharge = "INSERT INTO recharge (id_order, transaction_id, phone, money, type, status, today, url, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
                            await connection1.execute(sql_recharge, [id_order, 0, userInfo.phone || '0', amount,'Daily Acivity Bonus '+amount, 1, timeNow, 0, time]);
                        }
                        let totalMoney = parseFloat(userInfo.total_money)+parseInt(amount);
                        let userMoney = parseFloat(userInfo.money)+parseInt(amount);
                        await connection1.query('UPDATE users SET money = ?,total_money=? WHERE id = ?', [userMoney,totalMoney,userInfo.id]);
                        await connection1.commit();
                        res.status(200).json({
                            message: `Daily Reward claim successfull`,
                            status:true
                        })
                    }
                    else{
                        sendStatus(res,'Bets not enough to claim weekly Award.')
                    }
                }
                else{
                    sendStatus(res,'Already claimed weekly Award')
                }
            }
            else{
                sendStatus(res,'Something went wrong!')
            }
        }
        else{
            sendStatus(res,'User does not exist.')
        }
    }
    catch(err){
        console.log("err ",err);
        await connection1.rollback();
        sendStatus(res,'Something went wrong!')
    }
    finally {
        connection1.release();
    }
}

module.exports = {
    getTodayBat,
    getActivityReward,
    sendStatus
}