const http = require('http');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const oracleDB = require('./oracledb.js');
const { router: googleAuthRouter, getUserInfo } = require("./google_authController.js");
const bpmRouter = require('./bpm.js'); // bpm 라우터 모듈 불러오기

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(googleAuthRouter);
app.use(bpmRouter); // bpm 라우터 사용

// 정적 파일 미들웨어를 사용하여 CSS, 이미지, JS 등의 정적 파일 제공
app.use(express.static(path.join(__dirname, '/dashboard')));
const server = http.createServer(app);
const PORT_HTTP = 8081;
const PORT = 13389;

// Oracle DB 연결 확인
oracleDB.connectToOracleDB()
  .then(connection => {
    // 연결 성공 시 동작
    console.log('Oracle DB 연결 성공');
    // 여기서 필요한 작업 수행
  })
  .catch(error => {
    // 연결 실패 시 동작
    console.error('Oracle DB 연결 실패:', error);
  });

// Serve HTML page at port 8081
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'heart-dashboard', 'index.html'));
});
app.get('/login/:userEmailWithoutDomain', (req, res) => {
    const userEmailWithoutDomain = req.params.userEmailWithoutDomain;
    res.sendFile(path.join(__dirname, 'dashboard/pages', 'dashboard.html'));
    const accessToken = req.query.access_token; // 클라이언트에서 access token을 쿼리 파라미터로 전달
    console.log('로그인 토큰', accessToken);
    if (!accessToken) {
      res.status(400).send('Access token is missing');
      return;
    }
    res.cookie('accessToken', accessToken);
    
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

// Hourly chart handler
app.get('/hourly-chart', async (req, res) => {
  try {
    const userEmail = await getUserEmailFromToken(req);
    const query = oracleDB.everyHourDuringTheDayQuery();
    const result = await executeQuery(query, { Email: userEmail });

    const data = result.rows.map(row => {
      const date = row[0].slice(5, 16); // "2024-" 부분을 제거하고 월 일만 추출
      const [month, day, hour] = date.split(' ');
      const formattedDate = `${month} ${day}`;
      return [formattedDate, row[1]];
    });
    
    const responseData = {
      userEmail: userEmail,
      data: data
    };
    
    res.json(responseData);
  } catch (err) {
    res.status(500).send('Error retrieving data');
  }
});

// Start the HTTP server on port 8081
app.listen(PORT_HTTP, () => {
    console.log(`HTTP server is running on port ${PORT_HTTP}`);
});
app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`);
});

module.exports = { executeQuery, getUserEmailFromToken };
