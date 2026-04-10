import connection from "../config/connectDB";
import { sendStatus } from './activityController';
import cron from 'node-cron';
import { timerJoin } from './userController';
import { getUserFromAuthToken, buildOwnershipWhereClause } from '../services/sessionService';

let vipList = [
    {level_up:60,monthly:30,safe:0.1,rebate_rate:0.6,exp:3000},
    {level_up:180,monthly:90,safe:0.1,rebate_rate:0.6,exp:30000},
    {level_up:690,monthly:215,safe:0.15,rebate_rate:0.6,exp:200000},
    {level_up:1890,monthly:890,safe:0.15,rebate_rate:0.65,exp:3000000},
    {level_up:6900,monthly:1890,safe:0.2,rebate_rate:0.65,exp:10000000},
    {level_up:16900,monthly:6900,safe:0.2,rebate_rate:0.65,exp:50000000},
    {level_up:69000,monthly:16900,safe:0.225,rebate_rate:0.7,exp:300000000},
    {level_up:169000,monthly:69000,safe:0.25,rebate_rate:0.7,exp:1000000000},
    {level_up:690000,monthly:169000,safe:0.25,rebate_rate:0.7,exp:5000000000},
    {level_up:1690000,monthly:690000,safe:3,rebate_rate:0.8,exp:9999999999}
]

const getVip = async (req,res) => {
    try{
        let auth = req.cookies.auth;
    const userInfo = await getUserFromAuthToken(auth, { requireActive: true });
    console.log("user ",userInfo);
    if(userInfo){
      const ownership = buildOwnershipWhereClause(userInfo);
      const [totalBat] = await connection.query(`SELECT sum(money) as total FROM minutes_1 WHERE ${ownership.clause}`, ownership.params);
            console.log('total ',totalBat);
            const total = totalBat[0].total ? totalBat[0].total : 0; 
            const list = vipList;
      const [recentBat] = await connection.query(`SELECT money,today FROM minutes_1 WHERE ${ownership.clause} order by today desc limit 5`, ownership.params);
            const recentExp = recentBat;
            res.status(200).json({
                message: `VIP Data`,
                data:{total,list,recentExp},
                status: true,
            });
        }
        else{
            sendStatus(res,'User does not exist.')
        }
    }
    catch(err){
      console.log("err ",err);
     sendStatus(res,'Something went wrong!')
    }
    }

const updateVipLevel = async (phone, level, userId = null) => {
  console.log("vip level start");
  let connection1 = await connection.getConnection();
  try {
    await connection1.beginTransaction();
    const ownership = buildOwnershipWhereClause({ id: userId || 0, phone: phone || '' });
    const [totalBat] = await connection1.query(
      `SELECT sum(money) as total FROM minutes_1 WHERE ${ownership.clause}`,
      ownership.params
    );
    
    const total = Number(totalBat[0].total || 0);
    const vipLevel = vipList[level];
    if (!vipLevel) {
      await connection1.commit();
      return;
    }

    if (parseInt(total) >= vipLevel.exp) {
      let time = new Date().getTime();
      let timeNow = timerJoin(new Date().getTime());
      let id_order =
        Math.floor(Math.random() * (99999999999999 - 10000000000000 + 1)) +
        10000000000000;
      try {
        const sql_recharge =
          "INSERT INTO recharge (id_order, transaction_id, user_id, phone, money, type, status, today, url, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        await connection1.execute(sql_recharge, [
          id_order,
          0,
          userId || 0,
          phone || '0',
          vipLevel.level_up,
          "Vip Level Up",
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
          phone || '0',
          vipLevel.level_up,
          "Vip Level Up",
          1,
          timeNow,
          0,
          time,
        ]);
      }

      if (userId) {
        await connection1.query(
          "UPDATE users SET money = money + ?, total_money = total_money + ?, vip_level = ? WHERE `id` = ?",
          [vipLevel.level_up, vipLevel.level_up, level + 1, userId]
        );
      } else {
        await connection1.query(
          "UPDATE users SET money = money + ?, total_money = total_money + ?, vip_level = ? WHERE `phone` = ?",
          [vipLevel.level_up, vipLevel.level_up, level + 1, phone]
        );
      }

      await connection1.commit();
      console.log("vip level updated");
    }else{
       
        await connection1.commit();
    }
  } catch (err) {
    await connection1.rollback();
    console.log("vip error ", err);
  }
  finally {
    connection1.release();
  }
};


cron.schedule("0 0 1 * *", async () => {
  const [user] = await connection.query(
    "SELECT `phone`,`vip_level` FROM users where `vip_level` > 0"
  );
  console.log("user ", user);
  if (user.length > 0) {
    for (let i of user) {
      let connection1 = await connection.getConnection();
      try {
        await connection1.beginTransaction();
        let vipLevel = vipList[i.vip_level - 1];
        let time = new Date().getTime();
        let timeNow = timerJoin(new Date().getTime());
        let id_order =
          Math.floor(Math.random() * (99999999999999 - 10000000000000 + 1)) +
          10000000000000;
        const sql_recharge =
          "INSERT INTO recharge (id_order, transaction_id, phone, money, type, status, today, url, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        await connection1.execute(sql_recharge, [
          id_order,
          0,
          i.phone,
          vipLevel.monthly,
          "Vip Monthly Reward",
          1,
          timeNow,
          0,
          time,
        ]);
        await connection1.query(
          "UPDATE users SET money = money + ?, total_money = total_money + ? WHERE `phone` = ?",
          [vipLevel.monthly, vipLevel.monthly, i.phone]
        );
        await connection1.commit();
        console.log("monthly award added ",i.phone);
      } catch (err) {
        await connection1.rollback();
        console.log(`err for user ${i.phone}`, err);
      }
    }
  }
});

const getExpHistory = async (req,res) => {
  try{
    let auth = req.cookies.auth;
    const userInfo = await getUserFromAuthToken(auth, { requireActive: true });
    console.log("user ",userInfo);
    if(userInfo){
        const ownership = buildOwnershipWhereClause(userInfo);
        const [recentBat] = await connection.query(`SELECT money,today FROM minutes_1 WHERE ${ownership.clause} order by today desc`, ownership.params);
        const recentExp = recentBat;
        res.status(200).json({
            message: `Exp History`,
            data:{recentExp},
            status: true,
        });
    }
    else{
        sendStatus(res,'User does not exist.')
    }
}
catch(err){
  console.log("err ",err);
 sendStatus(res,'Something went wrong!')
}
}

const getSafe = async (req,res) => {
  try{
    let auth = req.cookies.auth;
    const [user] = await connection.query('SELECT id, money, phone FROM users WHERE `token` = ? AND veri = 1 AND status = 1 LIMIT 1', [auth]);
    console.log("user ",user);
    if(user.length > 0){
        const userInfo = user[0];
        const ownership = buildOwnershipWhereClause(userInfo);
        const [safe] = await connection.query(`select sum(amount) as amount,sum(interest_amount) as interest_amount from safe where ${ownership.clause} and type="Transfer In" and status = 1`, ownership.params);
        console.log("safe ",safe);
        let safeAmount = safe[0].amount ? safe[0].amount : '0.00';
        let interest_amount = safe[0].interest_amount ? safe[0].interest_amount : '0.00';
        const [safeInterest] = await connection.query(`select sum(interest_amount) as total from safe where ${ownership.clause} and status = 0 and type = "Transfer In"`, ownership.params);
        const totalInterest = safeInterest[0].total ? safeInterest[0].total : '0.00';
        const [safeList] = await connection.query(`select transcationId, amount,interest_amount,type,time from safe where ${ownership.clause} order by time desc limit 5`, ownership.params);
        res.status(200).json({
          message: `Safe Data`,
          data:{money:userInfo.money,safeAmount,interest_amount,totalInterest,safeList:safeList},
          status: true,
      });
    }
    else{
      sendStatus(res,'User does not exist.')
  }
  }
  catch(err){
    console.log("err ",err);
    sendStatus(res,'Something went wrong!')
  }
}

const getTranscationId = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const milliseconds = String(now.getMilliseconds()).padStart(3, '0');

  const dateTimePattern = `${year}${month}${day}${hours}${minutes}${seconds}${milliseconds}`;

  return dateTimePattern;
}

const transferToSafe = async (req,res) => {
  let connection1 = await connection.getConnection();
  try {
    await connection1.beginTransaction();
    let auth = req.cookies.auth;
    const { amount } = req.body;
    console.log("amount ",amount);
    const [user] = await connection1.query(
      "SELECT id, money, phone FROM users WHERE `token` = ? AND veri = 1 AND status = 1 LIMIT 1",
      [auth]
    );
    console.log("user ", user);
    if (user.length > 0) {
      const userInfo = user[0];
      const ownership = buildOwnershipWhereClause(userInfo);
      const [totalBat] = await connection1.query(
        `SELECT sum(money) as total FROM minutes_1 WHERE ${ownership.clause}`,
        ownership.params
      );
      console.log("total ", totalBat);
      const total = totalBat[0].total ? totalBat[0].total : 0;
      const [transferIn] = await connection.query(`select sum(amount) as amount from safe where ${ownership.clause} and type="Transfer In" and status = 1`, ownership.params);
        console.log("transferIn ",transferIn);
        let transferInAmount= transferIn[0].amount ? transferIn[0].amount : 0;
        let betsAmount = parseInt(total) -  parseInt(transferInAmount);
      if (parseInt(betsAmount) >= parseInt(amount)) {
        if (Number.isInteger(parseInt(amount)) && parseInt(amount) <= parseInt(userInfo.money)) {
          const transaction_id = getTranscationId();
          const time = timerJoin(new Date().getTime());
          try {
            await connection1.query(
              'Insert Into safe set transcationId = ?, user_id = ?, phone = ?, amount = ?, interest_rate = 0.10, type = "Transfer In", status = 1, time = ?',
              [transaction_id, userInfo.id, userInfo.phone || '0', amount, time]
            );
          } catch (error) {
            await connection1.query(
              'Insert Into safe set transcationId = ?, phone = ?, amount = ?, interest_rate = 0.10, type = "Transfer In", status=1, time = ?',
              [transaction_id, userInfo.phone || '0', amount, time]
            );
          }

          await connection1.query(
            "UPDATE users SET money = money - ?, total_money = total_money - ? WHERE `id` = ?",
            [amount, amount, userInfo.id]
          );
          const [safe] = await connection1.query(
            `select sum(amount) as amount from safe where ${ownership.clause} and status = 1`,
            ownership.params
          );
          console.log("safe ", safe);
          await connection1.commit();
          res.status(200).json({
            message: `Money Transfer Successfull.`,
            data: { safeAmount: safe[0].amount },
            status: true,
          });
        } else {
          await connection1.rollback();
          sendStatus(res, "Your wallet amount is not enough to Transfer In this amount.");
        }
      } else {
        await connection1.rollback();
        sendStatus(res, "Your bets is not enough to Transfer In this amount.");
      }
    } else {
      await connection1.rollback();
      sendStatus(res, "User does not exist.");
    }
  } catch (err) {
    console.log("err ", err);
    await connection1.rollback();
    sendStatus(res, "Something went wrong!");
  } finally {
    connection1.release();
  }
}

cron.schedule("0 0 * * *", async () => {
    const [safe] = await connection.query('select * from safe where type="Transfer In" and status=1');
    console.log("safe ",safe);
    if (safe.length > 0) {
      for (let i of safe) {
        let connection1 = await connection.getConnection();
        try {
          await connection1.beginTransaction();
          const { phone, amount, id } = i;
          let interestAmount = (amount * 0.1) / 100;
          await connection1.query(
            "update safe set interest_amount = interest_amount + ? , day = day + ? where id = ? and phone = ?",
            [interestAmount,1,id,phone]
          );
          await connection1.commit();
        } catch (err) {
          await connection1.rollback();
          console.log(`err for user ${i.phone}`, err);
        } finally {
          connection1.release();
        }
      }
    }  
})

const transferOut = async (req,res) => {
  let connection1 = await connection.getConnection();
  try{
    await connection1.beginTransaction()
    let auth = req.cookies.auth;
    const { amount } = req.body;
    const [user] = await connection1.query('SELECT id, money, phone FROM users WHERE `token` = ? AND veri = 1 AND status = 1 LIMIT 1', [auth]);
    console.log("user ",user);
    if(user.length > 0){
      const userInfo = user[0];
      const ownership = buildOwnershipWhereClause(userInfo);
      const [safe] = await connection1.query(`select sum(amount) as total, sum(interest_amount) as interest from safe where ${ownership.clause} and status = 1 and type="Transfer In"`, ownership.params);
      console.log("safe ",safe);
      const {total,interest} = safe[0];
      const totalAmount = Number(total || 0) + Number(interest || 0);
      if(parseInt(amount) == parseInt(total || 0)){
        const transaction_id = getTranscationId()
        const time = timerJoin(new Date().getTime());
        await connection1.query(
          "UPDATE users SET money = money + ?, total_money = total_money + ? WHERE `id` = ?",
          [totalAmount,totalAmount, userInfo.id]
        );
        await connection1.query(`update safe set status = 0 where ${ownership.clause} and status = 1 and type="Transfer In"`, ownership.params)

        try {
          await connection1.query('Insert Into safe set transcationId = ?, user_id = ?, phone = ?, amount = ?, interest_amount = ?, type = "Transfer Out", status = 0, time = ?', [transaction_id, userInfo.id, userInfo.phone || '0', total || 0, interest || 0, time]);
        } catch (error) {
          await connection1.query('Insert Into safe set transcationId = ?, phone = ?, amount = ?, interest_amount = ?, type = "Transfer Out", status = 0, time = ?', [transaction_id, userInfo.phone || '0', total || 0, interest || 0, time]);
        }

        const [accumulated] = await connection1.query(`select sum(interest_amount) as totalInterest from safe where ${ownership.clause} and status = 0 and type = "Transfer In"`, ownership.params);
        let { totalInterest } = accumulated[0];
        totalInterest = totalInterest ? totalInterest : '0.00';
        await connection1.commit();
        res.status(200).json({
          message: `Money Transfer Out Successfull.`,
          data:{ totalInterest },
          status: true,
      });
      }
      else{
        await connection1.rollback();
        sendStatus(res,'Something went wrong!')
      }
    }
    else{
      await connection1.rollback();
      sendStatus(res,'User does not exist.');
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

const SafeHistory = async (req,res) => {
  try{
    let auth = req.cookies.auth;
    const [user] = await connection.query('SELECT id, money, phone FROM users WHERE `token` = ? AND veri = 1 AND status = 1 LIMIT 1', [auth]);
    console.log("user ",user);
    if(user.length > 0){
      const userInfo = user[0];
      const ownership = buildOwnershipWhereClause(userInfo);
      const [safeList] = await connection.query(`select transcationId, amount,interest_amount,type,time from safe where ${ownership.clause} order by time desc`, ownership.params);
        res.status(200).json({
          message: `Safe Data`,
          data:{safeList:safeList},
          status: true,
      });
    }
    else{
      sendStatus(res,'User does not exist.')
  }
  }
  catch(err){
    console.log("err ",err);
    sendStatus(res,'Something went wrong!')
  }
}


module.exports = {
    getVip,
    updateVipLevel,
    getExpHistory,
    getSafe,
    transferToSafe,
    transferOut,
    SafeHistory
}