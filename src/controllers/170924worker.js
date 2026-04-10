const { workerData, parentPort } = require('worker_threads');
const mysql = require('mysql2/promise');

const connection = mysql.createPool({
    host: 'localhost',
    user: 'babagames',
    password: 'mpcMPYMLJkpkZMc2',
    database: 'babagames',
});

async function teamCommission(code) {
  try {
    let registrationCount = 0,
      depositCount = 0,
      depositAmount = 0,
      firstDepositCount = 0;
    let ar = [];
    ar.push(code);
    while (code) {
      console.log("code ", code);
      const [registration] = await connection.query(
        "SELECT count(*) as registrationCount  FROM `users` WHERE invite =?",
        [code]
      );
      const [deposit] = await connection.query(
        'SELECT count(*) as depositCount FROM users u INNER join recharge r on u.phone = r.phone WHERE u.invite = ? and r.type ="upi_manual"',
        [code]
      );
      const [depositAmountData] = await connection.query(
        'SELECT IFNULL(sum(r.money),0) as depositAmount FROM users u INNER join recharge r on u.phone = r.phone WHERE u.invite = ? and r.type ="upi_manual"',
        [code]
      );
      const [firstDepositCountData] = await connection.query(
        'SELECT  count(DISTINCT(u.phone)) as firstDepositCount FROM users u INNER join recharge r on u.phone = r.phone WHERE u.invite = ? and r.type ="upi_manual"',
        [code]
      );
      registrationCount += parseInt(registration[0].registrationCount);
      depositCount += parseInt(deposit[0].depositCount);
      depositAmount += parseFloat(depositAmountData[0].depositAmount);
      firstDepositCount += parseInt(firstDepositCountData[0].firstDepositCount);
      console.log(
        "inside while loop ",
        registrationCount,
        depositCount,
        depositAmount,
        firstDepositCount
      );
      await connection.query(
        "Update users set team_reg_number = ?,team_deposit_amount = ?, team_deposit_number = ?, team_first_deposit =? where code = ?",
        [
          registrationCount,
          depositAmount,
          depositCount,
          firstDepositCount,
          code,
        ]
      );
      let [user] = await connection.query(
        "select invite from users where code = ?",
        [code]
      );
      console.log("user ", user);
      if (user.length > 0) {
        code = user[0].invite ? user[0].invite : null;
      } else {
        console.log("break  code ", code);
        break;
      }
      if (ar.includes(code)) {
        break;
      } else {
        ar.push(code);
      }
    }
    console.log("process code ", ar);
    parentPort.postMessage("Team Commission distributed successfully ");
  } catch (error) {
    parentPort.postMessage(`Error: ${error.message}`);
  }
}

teamCommission(workerData.code);