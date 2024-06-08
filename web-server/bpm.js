const express = require("express");
const router = express.Router();
const static = require('serve-static');
const path = require('path');
const oracleDB = require('./oracledb.js');

router.use(express.urlencoded({extended:true}));
router.use(express.json());

router.post("/data", async (req, res) => {
    console.log("Received request body:", req.body); // 요청 본문 전체를 출력하여 디버그
    const { bpm, tag, email } = req.body;
    console.log(
      `Received data - BPM: ${bpm}, Tag: ${tag}, Email: ${email}`,
    );
    const EmailWithoutDomain = email.split('@')[0];
    try {
    const result = await oracleDB.insertBPMData(bpm, EmailWithoutDomain, tag);
    console.log('Successfully inserted BPM data into Oracle DB');
    res.sendStatus(200);
  } catch (error) {
    console.error('Error inserting BPM data into Oracle DB:', error);
    res.sendStatus(500);
  }
});

async function executeQuery(query, params) {
  const connection = await oracleDB.connectToOracleDB();
  try {
    const result = await connection.execute(query, params);
    await connection.close();
    return result;
  } catch (err) {
    console.error('Error executing query:', err);
    await connection.close();
    throw err;
  }
}

async function getUserEmailFromToken(req) {
  const accessToken = req.cookies.accessToken;
  if (!accessToken) {
    throw new Error('Access token is missing');
  }
  const userInfo = await getUserInfo(accessToken);
  return userInfo.email.split('@')[0];
}

// Realtime query handler
router.get('/realtime-bpm', async (req, res) => {
  try {
    const userEmail = await getUserEmailFromToken(req);
    const query = oracleDB.realtimeQuery();
    const result = await executeQuery(query, { Email: userEmail });

    const data = result.rows.map(row => row[0]);
    res.json(data);
  } catch (err) {
    res.status(500).send('Error retrieving data');
  }
});

// Min query handler
router.get('/average-bpm', async (req, res) => {
  try {
    // 사용자 이메일 정보를 가져옵니다.
    const userEmail = await getUserEmailFromToken(req);
    const query = oracleDB.minQuery();
    const result = await executeQuery(query, { Email: userEmail });

    // Convert the query result to an array
    const data = result.rows.map(row => row[0]);

    // Send the data as JSON
    res.json(data);
  } catch (err) {
    res.status(500).send('Error retrieving data');
  }
});

// Hour query handler
router.get('/hour-bpm', async (req, res) => {
  try {
    // 사용자 이메일 정보를 가져옵니다.
    const userEmail = await getUserEmailFromToken(req);
    const query = oracleDB.hourQuery();
    const result = await executeQuery(query, { Email: userEmail });

    // Convert the query result to an array
    const data = result.rows.map(row => row[0]);

    // Send the data as JSON
    res.json(data);
  } catch (err) {
    res.status(500).send('Error retrieving data');
  }
});

// Day query handler
router.get('/day-bpm', async (req, res) => {
  try {
    // 사용자 이메일 정보를 가져옵니다.
    const userEmail = await getUserEmailFromToken(req);
    const query = oracleDB.dayQuery();
    const result = await executeQuery(query, { Email: userEmail });

    // Convert the query result to an array
    const data = result.rows.map(row => row[0]);

    // Send the data as JSON
    res.json(data);
  } catch (err) {
    res.status(500).send('Error retrieving data');
  }
});
// Week query handler
router.get('/week-bpm', async (req, res) => {
  try {
    // 사용자 이메일 정보를 가져옵니다.
    const userEmail = await getUserEmailFromToken(req);
    const query = oracleDB.weekQuery();
    const result = await executeQuery(query, { Email: userEmail });

    // Convert the query result to an array
    const data = result.rows.map(row => row[0]);

    // Send the data as JSON
    res.json(data);
  } catch (err) {
    res.status(500).send('Error retrieving data');
  }
});

// Month query handler
router.get('/month-bpm', async (req, res) => {
  try {
    // 사용자 이메일 정보를 가져옵니다.
    const userEmail = await getUserEmailFromToken(req);
    const query = oracleDB.monthQuery();
    const result = await executeQuery(query, { Email: userEmail });

    // Convert the query result to an array
    const data = result.rows.map(row => row[0]);

    // Send the data as JSON
    res.json(data);
  } catch (err) {
    res.status(500).send('Error retrieving data');
  }
});

// Year query handler
router.get('/year-bpm', async (req, res) => {
  try {
    // 사용자 이메일 정보를 가져옵니다.
    const userEmail = await getUserEmailFromToken(req);
    const query = oracleDB.yearQuery();
    const result = await executeQuery(query, { Email: userEmail });

    // Convert the query result to an array
    const data = result.rows.map(row => row[0]);

    // Send the data as JSON
    res.json(data);
  } catch (err) {
    res.status(500).send('Error retrieving data');
  }
});

module.exports = { router, getUserInfo };
