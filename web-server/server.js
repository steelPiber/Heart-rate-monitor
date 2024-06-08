// 11.03 - 오라클 DB 데이터값 추출
console.log(`VERSION_0.1_11.29`);
console.log(`0.1 : 오라클 db 접속 및 포트 개선`);

console.log(`VERSION_0.2_12.01`);
console.log('0.2 : 1분당 평균심박수를 JSON형태로 응답');

const http = require('http');
const express = require('express');
const path = require('path');
const { router: googleAuthRouter, getUserInfo } = require("./google_authController.js");
const bpmRouter = require('./bpm.js'); // Updated import
const oracleDB = require('./oracledb.js');
const cookieParser = require('cookie-parser');

const app = express();
const PORT_HTTP = 8081;
const PORT = 13389;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(googleAuthRouter);
app.use('/bpm', bpmRouter); 

// Static Files
app.use(express.static(path.join(__dirname, '/dashboard')));

// Oracle DB Connection
oracleDB.connectToOracleDB()
  .then(connection => {
    console.log('Oracle DB 연결 성공');
  })
  .catch(error => {
    console.error('Oracle DB 연결 실패:', error);
  });

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'heart-dashboard', 'index.html'));
});

app.get('/login/:userEmailWithoutDomain', (req, res) => {
  const userEmailWithoutDomain = req.params.userEmailWithoutDomain;
  const accessToken = req.query.access_token;
  console.log('로그인 토큰', accessToken);

  if (!accessToken) {
    return res.status(400).send('Access token is missing');
  }

  res.cookie('accessToken', accessToken);
  res.sendFile(path.join(__dirname, 'dashboard/pages', 'dashboard.html'));
});

app.get('/min1', (req, res) => {
  res.sendFile(__dirname + '/min1.html');
});

app.get('/hourly', (req, res) => {
  res.sendFile(__dirname + '/hourlychart.html');
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

////////////////////////////////////////////////////////////////////////////


// Hourly chart handler
app.get('/hourly-chart', async (req, res) => {
  try {
    // 사용자 이메일 정보를 가져옵니다.
    const userEmail = await getUserEmailFromToken(req);

    const query = oracleDB.everyHourDuringTheDayQuery();
    const result = await executeQuery(query, { Email: userEmail });

    // Convert the query result to an array
    const data = result.rows.map(row => {
      // row[0]에서 "2024-" 부분을 제거하고 월 일만 추출
      const date = row[0].slice(5, 16); // "06-07 11"
      const [month, day, hour] = date.split(' ');
      const formattedDate = `${month} ${day}`;
      return [formattedDate, row[1]];
    });
    
    const responseData = {
      userEmail: userEmail,
      data: data
    };
    
    // Send the data as JSON
    res.json(responseData);
  } catch (err) {
    res.status(500).send('Error retrieving data');
  }
});

// Start the HTTP server on port 8081
app.listen(PORT_HTTP, () => {
    console.log(`HTTP server is running on port ${PORT_HTTP}`);
});
// Start the HTTP server on port 8081
app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`);
});
