console.log(`VERSION_0.2_12.01`);
console.log('0.2 : 1분당 평균심박수를 JSON형태로 응답');
console.log('0.2.1 :1시간 BPM 평균값 오류 반환');

const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const static = require('serve-static');
const expressWs = require('express-ws');

//  oracledb.js의 함수들 불러오기
const oracleDB = require('./oracledb.js');
const google_authController = require("./google_authController.js");

const app = express();
app.use(express.json());
app.use(google_authController);

const server = http.createServer(app);
const PORT_HTTP = 8081;
const PORT_WS = 13389;

const webSocket = new WebSocket('ws://127.0.0.1:13389');

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
webSocket.addEventListener('message', async event => {
    const message = event.data;
    console.log(`Received raw message: ${message}`);

    // 주어진 정규 표현식에 맞게 데이터를 파싱
    const regex = /^(\d+):\s*bpm:\s*(\d+)\s*user\(email=(.+)\)$/;
    
    const match = message.toString().match(regex);

    if (match) {
        const userId = match[1];
        const bpm = match[2];
        const email = match[3];
        console.log('User ID: ${userId}');    // 사용자 ID 출력
        console.log('BPM: ${bpm}');           // BPM 값 출력
        console.log('Email: ${email}');       // 이메일 주소 출력

        try {
            const result = await oracleDB.insertBPMData(bpm, email);
            console.log('Successfully inserted BPM data into Oracle DB');
        } catch (error) {
            console.error('Failed to insert BPM data into Oracle DB:', error);
        }
    } else {
        console.error('Message does not contain valid BPM');
    }
});

expressWs(app, server);

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

app.get('/realtime-bpm', async (req, res) => {
  try {
    // Oracle 데이터베이스에 연결
    const connection = await oracleDB.connectToOracleDB();
    // 데이터베이스 연결을 통해 min1_query를 실행하여 1분 전의 평균 BPM 값을 가져옴
    const result = await connection.execute(oracleDB.realtime_query);
    await connection.close();

    // 쿼리 결과를 배열로 변환, 시간과 해당 시간[0]의 BPM 값[1]으로 이루어져 있습니다.
    const data = result.rows.map(row => [row[0], row[1]]);

    // HTML에 전달하기 위해 JSON 형식으로 데이터 전송
    res.json(data);
  } catch (err) {
    res.status(500).send('Error retrieving data');
    console.error('데이터 검색 중 오류 발생:', err);
  }
});

/// 핸들러 등록 : average-bpm' 경로에 대한 GET 요청을 처리 
app.get('/average-bpm', async (req, res) => {
  try {
    // Oracle 데이터베이스에 연결
    const connection = await oracleDB.connectToOracleDB();
    // 데이터베이스 연결을 통해 min1_query를 실행하여 1분 전의 평균 BPM 값을 가져옴
    const result = await connection.execute(oracleDB.min1_query);
    await connection.close();

    // 쿼리 결과를 배열로 변환, 시간과 해당 시간[0]의 평균 BPM 값[1]으로 이루어져 있습니다.
    const data = result.rows.map(row => [row[0], row[1]]);

    // HTML에 전달하기 위해 JSON 형식으로 데이터 전송
    res.json(data);
  } catch (err) {
    res.status(500).send('Error retrieving data');
    console.error('데이터 검색 중 오류 발생:', err);
  }
});

/// 핸들러 등록 : hour-bpm 경로에 대한 GET 요청을 처리 
app.get('/hour-bpm', async (req, res) => {
  try {
    // Oracle 데이터베이스에 연결
    const connection = await oracleDB.connectToOracleDB();
    // 데이터베이스 연결을 통해 hour_query를 실행하여 1시간동안의 평균 BPM 값을 가져옴
    const result = await connection.execute(oracleDB.hour_query);
    await connection.close();

    // 쿼리 결과를 배열로 변환, 시간과 해당 시간[0]의 평균 BPM 값[1]으로 이루어져 있습니다.
    const data = result.rows.map(row => [row[0], row[1]]);

    // HTML에 전달하기 위해 JSON 형식으로 데이터 전송
    res.json(data);
  } catch (err) {
    res.status(500).send('Error retrieving data');
    console.error('hour_query:데이터 검색 중 오류 발생:', err);
  }
});

/// 핸들러 등록 : day-bpm 경로에 대한 GET 요청을 처리 
app.get('/day-bpm', async (req, res) => {
  try {
    // Oracle 데이터베이스에 연결
    const connection = await oracleDB.connectToOracleDB();
    // 데이터베이스 연결을 통해 min1_query를 실행하여 1분 전의 평균 BPM 값을 가져옴
    const result = await connection.execute(oracleDB.day_query);
    await connection.close();

    // 쿼리 결과를 배열로 변환, 시간과 해당 시간[0]의 평균 BPM 값[1]으로 이루어져 있습니다.
    const data = result.rows.map(row => [row[0], row[1]]);

    // HTML에 전달하기 위해 JSON 형식으로 데이터 전송
    res.json(data);
  } catch (err) {
    res.status(500).send('Error retrieving data');
    console.error('데이터 검색 중 오류 발생:', err);
  }
});

// 하루 1시간 평균 그래프 JSON 데이터 전송 
app.get('/hourly-chart', async (req, res) => {
  try {
    const connection = await oracleDB.connectToOracleDB();
    const result = await connection.execute(oracleDB.hourly_query);
    await connection.close();

    // 결과를 배열로 변환
    const data = result.rows.map(row => [row[0], row[1]]);

    // HTML에 전달하기 위해 JSON 형식으로 데이터 전송
    res.json(data);
  } catch (err) {
    res.status(500).send('데이터 검색 중 오류 발생');
    console.error('Error retrieving data:', err);
  }
});
// Create a WebSocket server at port 13389
const wss = new WebSocket.Server({ noServer: true });

// WebSocket server logic
wss.on('connection', ws => {
    console.log('WebSocket client connected');

    // Send a welcome message to the client
    ws.send('Welcome to the WebSocket server!');

    // Handle messages from the client
    ws.on('message', message => {
        console.log(`Received message: ${message}`);

        // Broadcast the message to all connected clients
        wss.clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(`Broadcast: ${message}`);
            }
        });
    });

    // Handle WebSocket closure
    ws.on('close', () => {
        console.log('WebSocket client disconnected');
    });
});
// Attach the WebSocket server to the HTTP server
server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, ws => {
        wss.emit('connection', ws, request);
    });
});

// Create a WebSocket server at port 13389
server.listen(PORT_HTTP, () => {
    console.log(`HTTP server is running on port ${PORT_HTTP}`);
    console.log(`WebSocket server is running on port ${PORT_WS}`);
});
