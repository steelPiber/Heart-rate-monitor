console.log(`VERSION_0.2_12.01`);
console.log('0.2 : 1분당 평균심박수를 JSON형태로 응답');
console.log('0.2.1 :1시간 BPM 평균값 오류 반환');

const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const expressWs = require('express-ws');

//  oracledb.js와 mail_auth.js의 함수들 불러오기
const oracleDB = require('./oracledb.js');
const nodemailer = require('./mail_auth.js');

const app = express();
const server = http.createServer(app);
const PORT_HTTP = 8081;
const PORT_WS = 13389;

const webSocket = new WebSocket.Server({ server });

// 정적 파일 제공
app.use(express.static('heart-dashboard'));

// Oracle DB 연결 확인
oracleDB.connectToOracleDB()
  .then(connection => {
    console.log('Oracle DB 연결 성공');
  })
  .catch(error => {
    console.error('Oracle DB 연결 실패:', error);
  });

// WebSocket 메시지 수신 시 실행
webSocket.on('connection', ws => {
    console.log('WebSocket client connected');
    ws.send('Welcome to the WebSocket server!');
    ws.on('message', message => {
        console.log(`Received message: ${message}`);
        // 여기에 필요한 처리를 추가하세요
    });
    ws.on('close', () => {
        console.log('WebSocket client disconnected');
    });
});

expressWs(app, server);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve HTML page at port 8081
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/heart-dashboard/index.html');
});
app.get('/min1', (req, res) => {
    res.sendFile(__dirname + '/min1.html');
});
app.get('/hourly', (req, res) => {
    res.sendFile(__dirname + '/hourlychart.html');
});

// 회원가입 처리
app.get('/signup', async (req, res) => {
    const userData = req.query;
    try {
        await oracleDB.insertUser(userData);
        nodemailer.sendVerificationEmail(userData.useremail);
        res.send("회원가입이 성공적으로 완료되었습니다.");
    } catch (error) {
        console.error('회원가입 오류:', error);
        res.status(500).send("회원가입 중 오류가 발생했습니다.");
    }
});

// Create a WebSocket server at port 13389
server.listen(PORT_HTTP, () => {
    console.log(`HTTP server is running on port ${PORT_HTTP}`);
    console.log(`WebSocket server is running on port ${PORT_WS}`);
});
