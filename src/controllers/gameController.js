import { timerJoin } from './userController';
import connection from "../config/connectDB";
const fs = require('fs');
const path = require('path');
const  axios = require('axios');

const AccountDetails = async (req,res) => {
 console.log("Account Details function call");
 try{
   const { user_id } = req.body;
   const [rows] = await connection.query('SELECT * FROM users WHERE id = ?', [user_id]);
   console.log("user ",rows);
   if(rows.length > 0){
    const { name_user, time } = rows[0];
    return res.json({
        email: '',
        name_jogador: name_user,
        date: time
    });
   }
   else{
    return res.status(400).send({status:false,error:'Invalid user.'})
   }
 }
 catch(err){
   console.log("err ",err);
   return res.status(400).send({status:false,error:'Something went wrong.'})
 }
}

const GetBalance = async (req,res) => {
    console.log("Get Balance function call");
    try{
        const { user_id } = req.body;
        const [rows] = await connection.query('SELECT * FROM users WHERE id = ? and status = 1', [user_id]);
        console.log("user ",rows);
        if(rows.length > 0){
         const { money } = rows[0];
         return res.json({
            status:1,
            balance:money
         });
        }
        else{
         return res.status(400).send({status:false,error:'Invalid user.'})
        }
      }
      catch(err){
        console.log("err ",err);
        return res.status(400).send({status:false,error:'Something went wrong.'})
      }
}

const SetTransactionBet = async (req,res) => {
    console.log("Set Transcation Bet function call");
    let connection1 = await connection.getConnection();
    await connection1.beginTransaction();
    try{
        const { user_id,transaction_id,bet,game } = req.body;
        const [rows] = await connection1.query('SELECT * FROM users WHERE id = ? and status = 1', [user_id]);
        console.log("user ",rows);
        if(rows.length > 0){
         const userInfo = rows[0];
         const { total_money,money } = rows[0];
         if(total_money >= bet && money >= bet){
            let timeNow = Date.now();
            let date = new Date();
            let checkTime = timerJoin(date.getTime());
           
            const sqlInsert = `INSERT INTO minutes_1 SET 
            id_product = ?,
            phone = ?,
            code = ?,
            invite = ?,
            level = ?,
            money = ?,
            amount = ?,
            fee = ?,
            game = ?,
            status = ?,
            today = ?,
            time = ?`;
            await connection1.execute(sqlInsert, [transaction_id, userInfo.phone, userInfo.code, userInfo.invite, userInfo.level, bet , bet, 0, game, 2, checkTime, timeNow]);
            await connection1.execute('UPDATE `users` SET `money` = `money` - ? , `total_money` = `total_money` - ? WHERE `id` = ? ', [bet,bet,userInfo.id]);
            const [users] = await connection1.query('SELECT * FROM users WHERE id = ? AND veri = 1  LIMIT 1 ', [userInfo.id]);
            console.log("updated user ",users);
            await connection1.commit();
            return res.json({
                status:true,
                'balance': users[0].money
            })
         }
         else{
          await connection1.rollback();
          return res.json({status:false,error:'Your balance is not sufficient to this bet.'})
         }
        }
        else{
         await connection1.rollback();
         return res.status(400).send({status:false,error:'Invalid user.'})
        }
      }
      catch(err){
        console.log("err ",err);
        await connection1.rollback();
        return res.status(400).send({status:false,error:'Something went wrong.'})
      }
      finally {
        await connection1.release();
      }
}

const SetTransactionWin = async (req,res) => {
    console.log("Set Transcation Win function call");
    let connection1 = await connection.getConnection();
    await connection1.beginTransaction();
    try{
        const { user_id,transaction_id,win,game } = req.body;
        
        const [rows] = await connection1.query('SELECT * FROM users WHERE id = ? and status = 1', [user_id]);
        console.log("user ",rows);
                
        if(rows.length > 0){
         const userInfo = rows[0];
         await connection1.execute('UPDATE `minutes_1` SET `get` = ?, `status` = 1 WHERE `id_product` = ? ', [win, transaction_id]);
         
         
         const sql = 'UPDATE `users` SET `money` = `money` + ? ,  `total_money` = `total_money`+ ? WHERE `id` = ? ';
         await connection1.execute(sql, [win,win,userInfo.id]);
         
         const [users] = await connection1.query('SELECT * FROM users WHERE id = ? AND veri = 1  LIMIT 1 ', [userInfo.id]);
         console.log("updated user ",users);
         await connection1.commit();
           return res.json({
                status:true,
                'balance': users[0].money
            })
        }
        else{
         await connection1.rollback();
         return res.status(400).send({status:false,error:'Invalid user.'})
        }
      }
      catch(err){
        console.log("err ",err);
        await connection1.rollback();
        return res.status(400).send({status:false,error:'Something went wrong.'})
      }
      finally {
        await connection1.release();
      }
}

const SetRefund = async (req,res) => {
    console.log("Set Refund function call");
    let connection1 = await connection.getConnection();
    await connection1.beginTransaction();
    try{
        const { user_id,transaction_id,amount,game } = req.body;
        const [rows] = await connection1.query('SELECT * FROM users WHERE id = ? and status = 1', [user_id]);
        console.log("user ",rows);
        if(rows.length > 0){
         const userInfo = rows[0];
         await connection1.execute('UPDATE `minutes_1` SET `money` = ?, amount = ?  WHERE `id_product` = ? and game = ?', [0,0, transaction_id,game]);
         const sql = 'UPDATE `users` SET `money` = `money` + ?,`total_money` = `total_money`+ ? WHERE `id` = ? ';
         await connection1.execute(sql, [amount,amount,userInfo.id]);
         const [users] = await connection1.query('SELECT * FROM users WHERE id = ? AND veri = 1  LIMIT 1 ', [userInfo.id]);
         console.log("updated user ",users);
         await connection1.commit();
           return res.json({
                status:true,
                'balance': users[0].money
            })
        }
        else{
         await connection1.rollback();
         return res.status(400).send({status:false,error:'Invalid user.'})
        }
      }
      catch(err){
        console.log("err ",err);
        await connection1.rollback();
        return res.status(400).send({status:false,error:'Something went wrong.'})
      }
      finally {
        connection1.release();
      }
}

const createGame = async (req,res) => {
  console.log("create game");
  let connection1 = await connection.getConnection();
    await connection1.beginTransaction();
try{
 
const data = [
      {
        id: 2912,
        provider_id: 40,
        game_server_url: null,
        game_id: 23273,
        game_name: "Big Juan",
        game_code: "23273",
        game_type: "slots",
        description: null,
        cover: "drakon/Big Juan.webp",
        technology: "html5",
        has_lobby: 0,
        is_mobile: 0,
        has_freespins: 0,
        has_tables: 0,
        only_demo: 1,
        distribution: "drakon",
        status: 1,
        created_at: "2024-07-13T08:11:22.000000Z",
        updated_at: "2024-07-13T08:11:22.000000Z",
        lobby_id: null,
        rtp: 90,
        provider_game: "pragmatic",
        banner: "https://gator.drakon.casino/storage/drakon/Big Juan.webp",
        
      },
      {
        id: 2913,
        provider_id: 40,
        game_server_url: null,
        game_id: 23274,
        game_name: "Santa's Wonderland",
        game_code: "23274",
        game_type: "slots",
        description: null,
        cover: "drakon/Santa's Wonderland.webp",
        technology: "html5",
        has_lobby: 0,
        is_mobile: 0,
        has_freespins: 0,
        has_tables: 0,
        only_demo: 1,
        distribution: "drakon",
        status: 1,
        created_at: "2024-07-13T08:11:23.000000Z",
        updated_at: "2024-07-13T08:11:23.000000Z",
        lobby_id: null,
        rtp: 90,
        provider_game: "pragmatic",
        banner:
          "https://gator.drakon.casino/storage/drakon/Santa's Wonderland.webp",
        
      },
      {
        id: 2914,
        provider_id: 40,
        game_server_url: null,
        game_id: 23275,
        game_name: "North Guardians",
        game_code: "23275",
        game_type: "slots",
        description: null,
        cover: "drakon/North Guardians.webp",
        technology: "html5",
        has_lobby: 0,
        is_mobile: 0,
        has_freespins: 0,
        has_tables: 0,
        only_demo: 1,
        distribution: "drakon",
        status: 1,
        created_at: "2024-07-13T08:11:24.000000Z",
        updated_at: "2024-07-13T08:11:24.000000Z",
        lobby_id: null,
        rtp: 90,
        provider_game: "pragmatic",
        banner: "https://gator.drakon.casino/storage/drakon/North Guardians.webp",
        
      },
      {
        id: 2915,
        provider_id: 40,
        game_server_url: null,
        game_id: 23276,
        game_name: "Wild West Gold Megaways",
        game_code: "23276",
        game_type: "slots",
        description: null,
        cover: "drakon/Wild West Gold Megaways.webp",
        technology: "html5",
        has_lobby: 0,
        is_mobile: 0,
        has_freespins: 0,
        has_tables: 0,
        only_demo: 1,
        distribution: "drakon",
        status: 1,
        created_at: "2024-07-13T08:11:25.000000Z",
        updated_at: "2024-07-13T08:11:25.000000Z",
        lobby_id: null,
        rtp: 90,
        provider_game: "pragmatic",
        banner:
          "https://gator.drakon.casino/storage/drakon/Wild West Gold Megaways.webp",
        
      }]

  const insertQuery = `
  INSERT INTO games_list (
    id, provider_id, game_server_url, game_id, game_name, game_code, game_type,
    description, cover, technology, has_lobby, is_mobile, has_freespins, has_tables,
    only_demo, distribution, status, created_at, updated_at, lobby_id, rtp, provider_game, banner
  ) VALUES ?;
`;

const values = data.map(game => [
  game.id,
  game.provider_id,
  game.game_server_url,
  game.game_id,
  game.game_name,
  game.game_code,
  game.game_type,
  game.description,
  game.cover,
  game.technology,
  game.has_lobby,
  game.is_mobile,
  game.has_freespins,
  game.has_tables,
  game.only_demo,
  game.distribution,
  game.status,
  game.created_at,
  game.updated_at,
  game.lobby_id,
  game.rtp,
  game.provider_game,
  game.banner
]);

// Assuming you have an async function to execute the query
let [result] = await connection1.query(insertQuery, [values]);
 console.log("result ",result);
 connection1.commit();
 res.json({message:'Game create successfull'});
}
catch(err){
  console.log("err ",err);
  await connection1.rollback();
  return res.status(400).send({status:false,error:'Something went wrong.'})
}
finally {
  connection1.release();
}
}


const getGameByProvider = async (req,res) => {
 try{
   let { name } = req.params;
   console.log("name ",name);
   const [row] = await connection.query('SELECT p.name,p.category,l.game_id,l.game_name,l.cover,l.banner FROM  game_provider p inner join games_list l on p.id = l.provider_id  WHERE subcategory = ?', [name]);
   console.log("data ",row);
   if(row.length > 0){
   let gamelist = [];
   let uniqueProvider =[];
   let category = row[0].category;
   for(let i of row){
    if(uniqueProvider.includes(i.name)){
      let index = uniqueProvider.indexOf(i.name);
      let temp = {...i}; 
      delete temp.name;
      gamelist[index].games.push(temp);
    }
    else{
      uniqueProvider.push(i.name);
      let temp = {...i}; 
      delete temp.name;
      gamelist.push({name:i.name,games:[temp]})
    }
   }
   const [provider] = await connection.query('select distinct subCategory from game_provider where category = ?',[category]);
   res.json({status:true,data:gamelist,providers:provider.length > 0 ? provider : []});
  }
  else{
    const [provider] = await connection.query('select distinct subCategory from game_provider where category In (select category from game_provider where subCategory = ?)',[name]);
    res.json({status:true,data:[],providers:provider.length > 0 ?provider : []});
  }
 }
 catch(err){
  console.log("err ",err);
  return res.status(200).send({status:false,message:'Something went wrong.'})
 }
} 

const searchGame = async (req,res) => {
  try{
    let { name } = req.params;
    if(name && name.length >= 3){
    name=name.trim()+'%';
    console.log("name ",name);
    const [row] = await connection.query('SELECT game_id,game_name,cover FROM  games_list   WHERE game_name like ?', [name]);
    console.log("data ",row);
    if(row.length > 0){
    let gamelist = [{name:'Games',games:row}];
    res.json({status:true,data:gamelist});
   }
   else{
    res.json({status:true,data:[]});
   }
  }
  else{
    return res.status(200).send({status:false,message:'Something went wrong.'})
  }
}
  catch(err){
   console.log("err ",err);
   return res.status(200).send({status:false,message:'Something went wrong.'})
  }
 } 

const getGamePage = (req,res) => {
  let { name } = req.params;
  return res.render("home/game.ejs",{ name });
}

const getAllGamePage = (req,res) => {
  return res.render("home/allGame.ejs");
} 

const downloadImages = async (cover,banner) => {
  try {
    console.log("image ",cover);
    let image = cover.split('/');
    const dir = path.resolve(__dirname, 'darkon1');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    const filePath = path.resolve(__dirname,'darkon1', image[1]);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
  }
    console.log("banner ",banner);
    const response = await axios(banner,{
        responseType: 'stream',
    });
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
} catch (error) {
    // console.error(`Error downloading :`, error.message);
    throw error;
}
}

const getImages = async (req,res) => {
  try{
  const [row] = await connection.query('select game_name,cover,banner from games_list where cover is not NULL order by id desc limit 500 OFFSET 8000');
   console.log("row ",row);
   let ar =[];
   const checkPromises = row.map(async (data) => {
    try {
        await fs.access(path.resolve(__dirname,data.cover));
        return { game_name:data.game_name, exists: true };
    } catch {
        ar.push(data.game_name);
        return { game_name:data.game, exists: false };
    }
});


console.log('All file checks completed.');
  // const apiPromises = row.map(async ({cover,banner}) => await downloadImages(cover,banner));

  //  await Promise.all(apiPromises);
  //  console.log('All images downloaded!');
   res.json({message:"Image that not exist",data:ar,count:ar.length});
}
catch(err){
  console.log("err ",err);
  res.status(400).send({error:err});
}
}

module.exports = {
    AccountDetails,
    GetBalance,
    SetTransactionBet,
    SetTransactionWin,
    SetRefund,
    createGame,
    getGameByProvider,
    getGamePage,
    getImages,
    getAllGamePage,
    searchGame
}
