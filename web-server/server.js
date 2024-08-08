const http = require('http');
const express = require('express');
const path = require('path');
const session = require('express-session');
const oracleDB = require('./oracledb.js');
const { router: googleAuthRouter } = require("./google_authController.js");
const bpmRouter = require('./bpm.js'); // bpm 라우터 모듈 불러오기
const { executeQuery } = require('./utility.js'); // 유틸리티 함수들 사용
const hrvRouter = require('./hrv.js');
const chartRouter = require('./chart.js');
const app = express();

app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: false,
    maxAge: 1000 * 60 * 60, // 1 hour
    httpOnly: true
  }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Form 데이터 처리 추가

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

app.get('/dashboard', (req, res) => {
    if (!req.session.user) {
        // 세션이 없는 경우 대시보드 페이지를 요청하지 않도록 리디렉션
        res.redirect('https://heartrate.ddns.net');
    } else {
        // 세션이 있는 경우 대시보드 페이지를 반환
        res.sendFile(path.join(__dirname, 'dashboard/pages', 'dashboard.html'));
    }
});

// 세션 만료 시간 조회 API
app.get('/session-time', (req, res) => {
  try {
    if (!req.session || !req.session.user || !req.session.user.email) {
      return res.json({ session: 'none' }); // 세션이 없거나 사용자 정보가 없는 경우
    }

    // 남은 세션 시간 계산
    const sessionExpiry = req.session.cookie.expires;
    const now = new Date();

    if (sessionExpiry instanceof Date) {
      const remainingTime = Math.max(0, Math.floor((sessionExpiry - now) / 1000)); // 초 단위로 계산
      res.json({ remainingTime });
    } else {
      res.status(500).send('세션 만료 시간 오류'); // 만료 시간이 Date 객체가 아닌 경우 처리
    }
  } catch (err) {
    console.error('세션 시간 조회 중 오류 발생:', err); // 오류 로그
    res.status(500).send('세션 시간 조회 중 오류 발생'); // 오류 처리
  }
});

// 주석 처리된 라우팅 복구 예시
/*
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
*/

app.get('/min1', (req, res) => {
  res.sendFile(path.join(__dirname, 'min1.html'));
});

app.get('/hourly', (req, res) => {
  res.sendFile(path.join(__dirname, 'hourlychart.html'));
});

// Start the HTTP server on port 8081
const PORT_HTTP = 8081;
app.listen(PORT_HTTP, () => {
  console.log(`HTTP server is running on port ${PORT_HTTP}`);
});

// Oracle DB 연결 확인
oracleDB.connectToOracleDB()
  .then(connection => {
    console.log('Oracle DB 연결 성공');
  })
  .catch(error => {
    console.error('Oracle DB 연결 실패:', error);
  });
