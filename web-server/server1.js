const http = require('http');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const oracleDB = require('./oracledb.js');
const { router: googleAuthRouter } = require("./google_authController.js");
const bpmRouter = require('./bpm.js'); // bpm 라우터 모듈 불러오기
const hrvRouter = require('./hrv.js');

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(googleAuthRouter);
app.use(bpmRouter); // bpm 라우터 사용
app.use(hrvRouter);

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
  console.log('getUserEmailFromToken : ', accessToken);
  const userInfo = await getUserInfo(accessToken);
  return userInfo.email.split('@')[0];
}

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

app.get('/training-record', (req, res) => {
  const token = req.cookies.accessToken;
  res.sendFile(path.join(__dirname, 'dashboard/pages', 'training-record.html'));
});

app.get('/sitemap', (req, res) => {
  const token = req.cookies.accessToken;
  res.sendFile(path.join(__dirname, 'dashboard/pages', 'sitemap.html'));
});

app.get('/donut', async (req, res) => {
  try {
    console.log('reqToken: ', req.cookies.accessToken);
    const userEmail = await getUserEmailFromToken(req);
    const query = oracleDB.daily_donut_chart();
    const result = await executeQuery(query, { Email: userEmail });

    if (!result) {
      // 쿼리 결과가 없는 경우, 빈 배열을 반환하도록 처리
      res.json([]);
    } else {

    // normal과 sleep이 쿼리 결과에 없는 경우 0으로 설정
    const processedData = result.rows.map(row => ({
      active: row.active || 0,
      exercise: row.exercise || 0,
      rest: row.rest || 0,
      normal: row.normal || 0,
      sleep: row.sleep || 0
    }));

    // 클라이언트에게 JSON 형식으로 데이터 반환
    res.json(processedData);
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.get('/min1', (req, res) => {
  res.sendFile(__dirname + '/min1.html');
});
app.get('/hourly', (req, res) => {
  res.sendFile(__dirname + '/hourlychart.html');
});


// Start the HTTP server on port 8081
app.listen(PORT_HTTP, () => {
  console.log(`HTTP server is running on port ${PORT_HTTP}`);
});
app.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
});
