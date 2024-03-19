console.log(`VERSION_0.2_12.01`);
console.log('0.2 : 1분당 평균심박수를 JSON형태로 응답');
console.log('0.2.1 :1시간 BPM 평균값 오류 반환');

const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const path = require('path');
const static = require('serve-static');
const expressWs = require('express-ws');

//  oracledb.js와 mail_auth.js의 함수들 불러오기
const oracleDB = require('./oracledb.js');
const nodemailer = require('./mail_auth.js');

const app = express();
app.use(express.urlencoded({extended:true})); //바꾼곳
app.use(express.json());
app.use('/public', static(path.join(__dirname, 'public')));

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
// 회원가입 처리
app.post('/signup', async (req, res)=> {
    console.log('/signup 호출됨 ' + req);
    const paramId = req.body.id;
    const paramname = req.body.username;
    const paramNickname = req.body.userNick;
    const paramPw = req.body.userpasswd;
    const paramEmail = req.body.useremail;
    const paramMac = req.body.userMac;
    try {
      // Oracle 데이터베이스에 연결
      const connection = await oracleDB.connectToOracleDB();
      // 데이터베이스 연결을 통해 min1_query를 실행하여 1분 전의 평균 BPM 값을 가져옴
      const result = await connection.execute(oracleDB.insertUser);
      await connection.close();
    } catch (err) {
      res.status(500).send('회원가입 오류');
      console.error('회원가입 오류', err);
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
