const http = require('http');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const oracleDB = require('./oracledb.js');
const { router: googleAuthRouter } = require("./google_authController.js");
const bpmRouter = require('./bpm.js'); // bpm 라우터 모듈 불러오기
const { executeQuery, getUserEmailFromToken } = require('./utility.js'); // 유틸리티 함수들 사용

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
    console.log('Oracle DB 연결 성공');
  })
  .catch(error => {
    console.error('Oracle DB 연결 실패:', error);
  });

// Serve HTML page at port 8081
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'heart-dashboard', 'index.html'));
});
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard/pages', 'dashboard.html'));
});
app.get('/min1', (req, res) => {
  res.sendFile(__dirname + '/min1.html');
});
app.get('/hourly', (req, res) => {
  res.sendFile(__dirname + '/hourlychart.html');
});

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
