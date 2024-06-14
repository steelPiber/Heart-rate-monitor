const session = require('express-session');
const http = require('http');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const oracleDB = require('./oracledb.js');
const { router: googleAuthRouter } = require("./google_authController.js");
const bpmRouter = require('./bpm.js'); 
const { executeQuery, getUserEmailFromToken } = require('./utility.js');
const hrvRouter = require('./hrv.js');
const chartRouter = require('./chart.js');
const axios = require('axios');
const app = express();

app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

app.use(express.json());
app.use(cookieParser());
app.use(googleAuthRouter);
app.use(bpmRouter); 
app.use(hrvRouter);
app.use(chartRouter);

app.use(express.static(path.join(__dirname, '/dashboard')));

const server = http.createServer(app);
const PORT_HTTP = 8081;
const PORT = 13389;

oracleDB.connectToOracleDB()
  .then(connection => {
    console.log('Oracle DB 연결 성공');
  })
  .catch(error => {
    console.error('Oracle DB 연결 실패:', error);
  });

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
  req.session.user = userEmailWithoutDomain;
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

app.get('/training-record', (req, res) => {
  if (!req.session.user) {
    res.status(400).send('User not logged in');
    return;
  }
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

app.get('/training-record/records', async (req, res) => {
  if (!req.session.user) {
    res.status(400).send('User not logged in');
    return;
  }
  const userEmailWithoutDomain = req.session.user;
  try {
    const response = await axios.get(`http://localhost:10021/api/records/${userEmailWithoutDomain}`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching training records:', error);
    res.status(500).send('Error fetching training records');
  }
});

app.get('/training-record/:recordId/segments', async (req, res) => {
  if (!req.session.user) {
    res.status(400).send('User not logged in');
    return;
  }
  const recordId = req.params.recordId;
  const userEmailWithoutDomain = req.session.user;
  try {
    const response = await axios.get(`http://localhost:10021/api/records/${userEmailWithoutDomain}/${recordId}/segments`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching segments:', error);
    res.status(500).send('Error fetching segments');
  }
});

app.listen(PORT_HTTP, () => {
  console.log(`HTTP server is running on port ${PORT_HTTP}`);
});

app.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
});
