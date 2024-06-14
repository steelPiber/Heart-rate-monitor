const http = require('http');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const axios = require('axios');
const { router: googleAuthRouter } = require("./google_authController.js");
const bpmRouter = require('./bpm.js'); // bpm 라우터 모듈 불러오기
const hrvRouter = require('./hrv.js');
const chartRouter = require('./chart.js');
const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(googleAuthRouter);
app.use(bpmRouter); // bpm 라우터 사용
app.use(hrvRouter);
app.use(chartRouter);

// 정적 파일 미들웨어를 사용하여 CSS, 이미지, JS 등의 정적 파일 제공
app.use(express.static(path.join(__dirname, '/dashboard')));

// Serve HTML page at port 8081
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard/pages', 'dashboard.html'));
});

app.get('/login/:userEmailWithoutDomain', (req, res) => {
  const userEmailWithoutDomain = req.params.userEmailWithoutDomain;
  const accessToken = req.query.access_token;
  console.log('로그인 토큰', accessToken);
  if (!accessToken) {
    res.status(400).send('Access token is missing');
    return;
  }
  res.cookie('accessToken', accessToken);
  res.sendFile(path.join(__dirname, 'dashboard/pages', 'dashboard.html'));
});

app.get('/dashboard', (req, res) => {
  const token = req.cookies.accessToken;
  res.sendFile(path.join(__dirname, 'dashboard/pages', 'dashboard.html'));
});

app.get('/beat-track', (req, res) => {
  const token = req.cookies.accessToken;
  res.sendFile(path.join(__dirname, 'dashboard/pages', 'beat-track.html'));
});

app.get('/training-record/:userEmailWithoutDomain', (req, res) => {
  const token = req.cookies.accessToken;
  res.sendFile(path.join(__dirname, 'dashboard/pages', 'training-record.html'));
});

app.get('/sitemap', (req, res) => {
  const token = req.cookies.accessToken;
  res.sendFile(path.join(__dirname, 'dashboard/pages', 'sitemap.html'));
});

app.get('/min1', (req, res) => {
  res.sendFile(__dirname + '/min1.html');
});

app.get('/hourly', (req, res) => {
  res.sendFile(__dirname + '/hourlychart.html');
});

// /training-record에서 운동 기록 API 사용
app.get('/training-record/:userEmailWithoutDomain/records', async (req, res) => {
  const userEmailWithoutDomain = req.params.userEmailWithoutDomain;
  try {
    const response = await axios.get(`http://localhost:10021/api/records/${userEmailWithoutDomain}`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching training records:', error);
    res.status(500).send('Error fetching training records');
  }
});

// /training-record/:userEmailWithoutDomain/:recordId/segments에서 세그먼트 데이터 API 사용
app.get('/training-record/:userEmailWithoutDomain/:recordId/segments', async (req, res) => {
  const recordId = req.params.recordId;
  try {
    const response = await axios.get(`http://localhost:10021/api/records/${req.params.userEmailWithoutDomain}/${recordId}/segments`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching segments:', error);
    res.status(500).send('Error fetching segments');
  }
});

const PORT_HTTP = 8081;
const PORT = 13389;

// Start the HTTP server on port 8081
app.listen(PORT_HTTP, () => {
  console.log(`HTTP server is running on port ${PORT_HTTP}`);
});

app.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
});
