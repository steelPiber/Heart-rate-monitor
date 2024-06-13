const http = require('http');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const oracleDB = require('./oracledb.js');
const { router: googleAuthRouter } = require("./google_authController.js");
const bpmRouter = require('./bpm.js'); // bpm 라우터 모듈 불러오기
const { executeQuery, getUserEmailFromToken } = require('./utility.js'); // 유틸리티 함수들 사용
//const hrvRouter = require('./hrv.js');
const chartRouter = require('./chart.js');
const app = express();

app.use(express.static('public'));
app.use(express.json());
app.use(cookieParser());
app.use(googleAuthRouter);
app.use(bpmRouter); // bpm 라우터 사용
//app.use(hrvRouter);
app.use(chartRouter);

// 정적 파일 미들웨어를 사용하여 CSS, 이미지, JS 등의 정적 파일 제공
app.use(express.static(path.join(__dirname, '/dashboard')));
const server = http.createServer(app);
const PORT_HTTP = 8081;
const PORT = 13389;
const EX_PORT = 3001;

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
  res.sendFile(path.join(__dirname, 'dashboard/pages', 'dashboard.html'));
});

app.get('/login/:userEmailWithoutDomain', (req, res) => {
  const userEmailWithoutDomain = req.params.userEmailWithoutDomain;
  if (!accessToken) {
    return res.redirect('/auth/google');
  }
  res.sendFile(path.join(__dirname, 'dashboard/pages', 'dashboard.html'));
});
app.get('/training-record', (req, res) => {
  const accessToken = req.cookies.accessToken;
  res.sendFile(path.join(__dirname, 'dashboard/pages', 'training-record.html'));
});
app.get('/beat-track', (req, res) => {
  const accessToken = req.cookies.accessToken;
  res.sendFile(path.join(__dirname, 'dashboard/pages', 'training-record.html'));
});

app.get('/min1', (req, res) => {
  res.sendFile(__dirname + '/min1.html');
});
app.get('/hourly', (req, res) => {
  res.sendFile(__dirname + '/hourlychart.html');
});

app.post('/api/record', (req, res) => {
    const record = req.body;
    console.log('Received record:', record);
    exerciseRecords.push(record);
    res.status(200).send('Record received');
});

app.get('/api/records', (req, res) => {
    res.json(exerciseRecords);
});


// Start the HTTP server on port 8081
app.listen(PORT_HTTP, () => {
  console.log(`HTTP server is running on port ${PORT_HTTP}`);
});
app.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
});
app.listen(EX_PORT, () => {
  console.log(`EX_server is running on port ${EX_PORT}`);
});
