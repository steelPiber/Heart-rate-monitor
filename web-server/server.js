// 11.03 - 오라클 DB 데이터값 추출
console.log(`VERSION_0.1_11.29`);
console.log(`0.1 : 오라클 db 접속 및 포트 개선`);

console.log(`VERSION_0.2_12.01`);
console.log('0.2 : 1분당 평균심박수를 JSON형태로 응답');

const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const static = require('serve-static');
const expressWs = require('express-ws');
const path = require('path');

//  oracledb.js의 함수들 삽입 
const oracleDB = require('./oracledb.js'); // oracledb.js 파일 경로에 따라 수정
const google_authController = require("./google_authController.js");
const cookieParser = require('cookie-parser');

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(google_authController);

// 정적 파일 미들웨어를 사용하여 CSS, 이미지, JS 등의 정적 파일 제공
app.use(express.static(path.join(__dirname, '/heart-dashboard')));
const server = http.createServer(app);
const PORT_HTTP = 8081;
const PORT_WS = 13389;


const webSocket = new WebSocket('ws://127.0.0.1:13389');

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
webSocket.addEventListener('message',async event =>{
    const message = event.data;
    console.log(`Received raw message: ${message}`);

    // 주어진 정규 표현식에 맞게 데이터를 파싱
    const regex = /^(\d+):\s*bpm:\s*(\d+)\s*user\(email=(.+)\)$/;

    const match = message.toString().match(regex);

    if (match) {
        const userId = match[1];
        const bpm = match[2];
        const email = match[3];
        const userEmail = email.split('@')[0];
        try {
            const result = await oracleDB.insertBPMData(bpm, userEmail);
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
    const userEmailWithoutDomain = req.params.userEmailWithoutDomain;
    res.sendFile(__dirname + '/index.html');
});
app.get('/login/:userEmailWithoutDomain', (req, res) => {
    const userEmailWithoutDomain = req.params.userEmailWithoutDomain;
    res.sendFile(__dirname + '/heart-dashboard/index.html');
    const accessToken = req.query.access_token; // 클라이언트에서 access token을 쿼리 파라미터로 전달
    if (!accessToken) {
      res.status(400).send('Access token is missing');
      return;
    }
    res.cookie('accessToken', accessToken);
    
});
app.get('/min1', (req, res) => {
    res.sendFile(__dirname + '/min1.html');
});
app.get('/hourly', (req, res) => {
    res.sendFile(__dirname + '/hourlychart.html');
});


////////////////////////////////////////////////////////////////////////////


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

// Realtime query handler
app.get('/realtime-bpm', async (req, res) => {
  try {

    const accessToken = req.cookies.accessToken;
      
    const userInfo = await getUserInfo(accessToken);
    // 사용자 이메일 정보를 가져옵니다.
    const userEmail = userInfo.email;
    
    const query = oracleDB.realtimeQuery();
    const result = await executeQuery(query, { Email: userEmail }); // 사용자 이메일을 쿼리에 전달

    // Convert the query result to an array
    const data = result.rows.map(row => row[0]);

    // Send the data as JSON
    res.json(data);
  } catch (err) {
    res.status(500).send('Error retrieving data');
    console.error('데이터 검색 중 오류 발생:', err);
  }
});

// Min query handler
app.get('/average-bpm', async (req, res) => {
  try {
    // 사용자 이메일 정보를 가져옵니다.
    const userEmail = 'pyh5523';

    const query = oracleDB.minQuery();
    const result = await executeQuery(query, { Email: userEmail });

    // Convert the query result to an array
    const data = result.rows.map(row => row[0]);

    // Send the data as JSON
    res.json(data);
  } catch (err) {
    res.status(500).send('Error retrieving data');
    console.error('데이터 검색 중 오류 발생:', err);
  }
});

// Hour query handler
app.get('/hour-bpm', async (req, res) => {
  try {
    // access 토큰을 사용하여 사용자 정보 가져오기
    const userInfo = await getUserInfo(accessToken);
    // 사용자 이메일 정보를 가져옵니다.
    const userEmail = 'pyh5523';

    const query = oracleDB.hourQuery();
    const result = await executeQuery(query, { Email: userEmail });

    // Convert the query result to an array
    const data = result.rows.map(row => row[0]);

    // Send the data as JSON
    res.json(data);
  } catch (err) {
    res.status(500).send('Error retrieving data');
    console.error('데이터 검색 중 오류 발생:', err);
  }
});

// Day query handler
app.get('/day-bpm', async (req, res) => {
  try {
    // access 토큰을 사용하여 사용자 정보 가져오기
    const userInfo = await getUserInfo(accessToken);
    // 사용자 이메일 정보를 가져옵니다.
    const userEmail = 'pyh5523';
    
    const query = oracleDB.dayQuery();
    const result = await executeQuery(query, { Email: userEmail });

    // Convert the query result to an array
    const data = result.rows.map(row => row[0]);

    // Send the data as JSON
    res.json(data);
  } catch (err) {
    res.status(500).send('Error retrieving data');
    console.error('데이터 검색 중 오류 발생:', err);
  }
});

// Month query handler
app.get('/monthquery', async (req, res) => {
  try {
    // access 토큰을 사용하여 사용자 정보 가져오기
    const userInfo = await getUserInfo(accessToken);
    // 사용자 이메일 정보를 가져옵니다.
    const userEmail = 'pyh5523';

    const query = oracleDB.monthQuery();
    const result = await executeQuery(query, { Email: userEmail });

    // Convert the query result to an array
    const data = result.rows.map(row => row[0]);

    // Send the data as JSON
    res.json(data);
  } catch (err) {
    res.status(500).send('Error retrieving data');
    console.error('데이터 검색 중 오류 발생:', err);
  }
});

// Year query handler
app.get('/yearquery', async (req, res) => {
  try {
    // access 토큰을 사용하여 사용자 정보 가져오기
    const userInfo = await getUserInfo(accessToken);
    // 사용자 이메일 정보를 가져옵니다.
    const userEmail = 'pyh5523';

    const query = oracleDB.yearQuery();
    const result = await executeQuery(query, { Email: userEmail });

    // Convert the query result to an array
    const data = result.rows.map(row => row[0]);

    // Send the data as JSON
    res.json(data);
  } catch (err) {
    res.status(500).send('Error retrieving data');
    console.error('데이터 검색 중 오류 발생:', err);
  }
});

// Hourly chart handler
app.get('/hourlychartquery', async (req, res) => {
  try {

    // access 토큰을 사용하여 사용자 정보 가져오기
    const userInfo = await getUserInfo(accessToken);
    // 사용자 이메일 정보를 가져옵니다.
    const userEmail = 'pyh5523';

    const query = oracleDB.everyHourDuringTheDayQuery();
    const result = await executeQuery(query, { Email: userEmail });

    // Convert the query result to an array
    const data = result.rows.map(row => [row[0], row[1]]);

    // Send the data as JSON
    res.json(data);
  } catch (err) {
    res.status(500).send('Error retrieving data');
    console.error('데이터 검색 중 오류 발생:', err);
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

// Start the HTTP server on port 8081
server.listen(PORT_HTTP, () => {
    console.log(`HTTP server is running on port ${PORT_HTTP}`);
    console.log(`WebSocket server is running on port ${PORT_WS}`);
});
