const http = require('http');
const express = require('express');
const path = require('path');
const { router: googleAuthRouter, getUserInfo } = require("./google_authController.js");
const bpmRouter = require('./bpm.js'); // Updated import
const oracleDB = require('./oracledb.js');
const cookieParser = require('cookie-parser');

const app = express();
const PORT_HTTP = 8081;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(googleAuthRouter);
app.use('/bpm', bpmRouter); // Updated usage

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

// Start the HTTP server
app.listen(PORT_HTTP, () => {
  console.log(`HTTP server is running on port ${PORT_HTTP}`);
});
