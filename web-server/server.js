const express = require('express');
const path = require('path');
const session = require('express-session');
const { router: googleAuthRouter } = require("./google_authController.js");
const bpmRouter = require('./bpm.js'); // bpm 라우터 모듈 불러오기
const hrvRouter = require('./hrv.js');
const chartRouter = require('./chart.js');
const oracleDB = require('./oracledb.js');
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'dashboard/pages'));

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

// 세션 생성 시 세션 시작 시간을 저장
app.use((req, res, next) => {
  if (!req.session.startTime) {
    req.session.startTime = new Date().getTime(); // 현재 시간 저장
  }
  next();
});

// 세션 만료 시간 조회 API
app.get('/session-time', (req, res) => {
  try {
    if (!req.session || !req.session.user || !req.session.user.email) {
      return res.json({ session: 'none' }); // 세션이 없거나 사용자 정보가 없는 경우
    }

    const now = new Date().getTime();
    const sessionStartTime = req.session.startTime;
    const maxAge = req.session.cookie.maxAge;

    // 남은 세션 시간 계산
    const remainingTime = Math.max(0, Math.floor((sessionStartTime + maxAge - now) / 1000)); // 초 단위로 계산

    res.json({ remainingTime });
  } catch (err) {
    console.error('세션 시간 조회 중 오류 발생:', err); // 오류 로그
    res.status(500).send('세션 시간 조회 중 오류 발생'); // 오류 처리
  }
});

app.get('/min1', (req, res) => {
  res.sendFile(path.join(__dirname, 'min1.html'));
});

app.get('/hourly', (req, res) => {
  res.sendFile(path.join(__dirname, 'hourlychart.html'));
});

// Start the HTTP server on port 8081
const PORT_HTTP = 8081;
const PORT = 13389;
app.listen(PORT_HTTP, () => {
  console.log(`HTTP server is running on port ${PORT_HTTP}`);
});
app.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
});
// Oracle DB 연결 확인
oracleDB.connectToOracleDB()
  .then(connection => {
    console.log('Oracle DB 연결 성공');
  })
  .catch(error => {
    console.error('Oracle DB 연결 실패:', error);
  });
