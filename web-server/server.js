console.log(`VERSION_0.2_12.01`);
console.log('0.2 : 1분당 평균심박수를 JSON형태로 응답');
console.log('0.2.1 :1시간 BPM 평균값 오류 반환');

const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const expressWs = require('express-ws');
const app = express();

//  oracledb.js의 함수들 삽입 
const oracleDB = require('./oracledb.js'); // oracledb.js 파일 경로에 따라 수정
// mail_auth.js의 함수들 삽입          //바꾼곳
const nodemailer = require('./mail_auth.js'); // mail_auth.js 파일 경로에 따라 수정  //바꾼곳

const server = http.createServer(app);
const PORT_HTTP = 8081;
const PORT_WS = 13389;


const webSocket = new WebSocket('ws://127.0.0.1:13389');

// Add WebSocket support to Express
expressWs(app, server);

app.use(express.urlencoded({ extended: true })); // 바꾼곳
app.use(express.json()); // 바꾼곳

//정적 파일 제공
app.use (express.static('heart-dashboard'));


// Oracle DB 연결 확인
oracleDB.connectToOracleDB()
  .then(connection => {
    // 연결 성공 시 동작
    console.log('Oracle DB 연결 성공');
    // 여기서 필요한 작업 수행
  })
  .catch(error => {
    // 연결 실패 시 동작
    console.error('Oracle DB 연결 실패:', error);
  });


// WebSocket 메시지 수신 시 실행
webSocket.addEventListener('message', event =>{
    const message = event.data;

    //정규 표현식 사용하여 bpm값만 추출
    const bpmMatch = message.match(/bpm:\s*(\d+)/);
//정규 표현식 사용하여 battery값만 추출
    const batteryMatch = message.match(/battery:\s*(\d+)/);

    if(bpmMatch){
        //추출한 숫자 -> 정수로 변환하여 BPM 값을 업데이트 
        const bpmValue = parseInt(bpmMatch[1]);
        oracleDB.insertBPMData(bpmValue);

    }
});

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
app.get('/signup', (req, res) => {
  res.sendFile(__dirname + 'heart-dashboard/signup.html');
});


//////////////////////////////////////
/// 핸들러 등록 : realtime-bpm' 경로에 대한 GET 요청을 처리 
app.get('/realtime-bpm', async (req, res) => {   //바꾼곳
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

app.post('/mail', async (req, res) => {   // 바꾼곳
    // POST 요청의 바디로부터 사용자 데이터 추출
    const userData = req.body;

    try {
        // 사용자 데이터를 데이터베이스에 삽입
        await oracleDB.insertUser(userData);

        // 회원가입 인증 이메일 보내기
        nodemailer.sendVerificationEmail(userData.email);

        // 성공 응답 보내기
        res.send("회원가입이 성공적으로 완료되었습니다.");
    } catch (error) {
        console.error('회원가입 오류:', error);
        res.status(500).send("회원가입 중 오류가 발생했습니다.");
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

// Start the HTTP server on port 8080
server.listen(PORT_HTTP, () => {
    console.log(`HTTP server is running on port ${PORT_HTTP}`);
    console.log(`WebSocket server is running on port ${PORT_WS}`);
});
