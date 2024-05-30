// 11.03 - 오라클 DB 데이터값 추출
console.log(`VERSION_0.1_11.29`);
console.log(`0.1 : 오라클 db 접속 및 포트 개선`);

console.log(`VERSION_0.2_12.01`);
console.log('0.2 : 1분당 평균심박수를 JSON형태로 응답');

const http = require('http');
const express = require('express');
const static = require('serve-static');
const path = require('path');
const controltower = require("./controltower.js");

//  oracledb.js의 함수들 삽입 
const oracleDB = require('./oracledb.js'); // oracledb.js 파일 경로에 따라 수정
const { router: googleAuthRouter, getUserInfo } = require("./google_authController.js");
const cookieParser = require('cookie-parser');

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(googleAuthRouter);
app.use(controltower);

// 정적 파일 미들웨어를 사용하여 CSS, 이미지, JS 등의 정적 파일 제공
app.use(express.static(path.join(__dirname, '/heart-dashboard')));
const server = http.createServer(app);
const PORT_HTTP = 8081;
const PORT = 13389;

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

app.post("/data", async (req, res) => {
    console.log("Received request body:", req.body); // 요청 본문 전체를 출력하여 디버그
    const { bpm, tag, email } = req.body;
    console.log(
      `Received data - BPM: ${bpm}, Tag: ${tag}, Email: ${email}`,
    );
    
    try {
    const result = await oracleDB.insertBPMData(bpm, email, tag);
    console.log('Successfully inserted BPM data into Oracle DB');
    res.sendStatus(200);
  } catch (error) {
    console.error('Error inserting BPM data into Oracle DB:', error);
    res.sendStatus(500);
  }
});


// Serve HTML page at port 8081
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});
app.get('/login/:userEmailWithoutDomain', (req, res) => {
    const userEmailWithoutDomain = req.params.userEmailWithoutDomain;
    res.sendFile(__dirname + '/heart-dashboard/index.html');
    const accessToken = req.query.access_token; // 클라이언트에서 access token을 쿼리 파라미터로 전달
    console.log('로그인 토큰', accessToken);
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

async function getUserEmailFromToken(req) {
  const accessToken = req.cookies.accessToken;
  if (!accessToken) {
    throw new Error('Access token is missing');
  }
  const userInfo = await getUserInfo(accessToken);
  return userInfo.email.split('@')[0];
}

// Realtime query handler
app.get('/realtime-bpm', async (req, res) => {
  try {
    const userEmail = await getUserEmailFromToken(req);
    const query = oracleDB.realtimeQuery();
    const result = await executeQuery(query, { Email: userEmail });

    const data = result.rows.map(row => row[0]);
    res.json(data);
  } catch (err) {
    res.status(500).send('Error retrieving data');
  }
});

// Min query handler
app.get('/average-bpm', async (req, res) => {
  try {
    // 사용자 이메일 정보를 가져옵니다.
    const userEmail = await getUserEmailFromToken(req);
    const query = oracleDB.minQuery();
    const result = await executeQuery(query, { Email: userEmail });

    // Convert the query result to an array
    const data = result.rows.map(row => row[0]);

    // Send the data as JSON
    res.json(data);
  } catch (err) {
    res.status(500).send('Error retrieving data');
  }
});

// Hour query handler
app.get('/hour-bpm', async (req, res) => {
  try {
    // 사용자 이메일 정보를 가져옵니다.
    const userEmail = await getUserEmailFromToken(req);
    const query = oracleDB.hourQuery();
    const result = await executeQuery(query, { Email: userEmail });

    // Convert the query result to an array
    const data = result.rows.map(row => row[0]);

    // Send the data as JSON
    res.json(data);
  } catch (err) {
    res.status(500).send('Error retrieving data');
  }
});

// Day query handler
app.get('/day-bpm', async (req, res) => {
  try {
    // 사용자 이메일 정보를 가져옵니다.
    const userEmail = await getUserEmailFromToken(req);
    const query = oracleDB.dayQuery();
    const result = await executeQuery(query, { Email: userEmail });

    // Convert the query result to an array
    const data = result.rows.map(row => row[0]);

    // Send the data as JSON
    res.json(data);
  } catch (err) {
    res.status(500).send('Error retrieving data');
  }
});

// Month query handler
app.get('/monthquery', async (req, res) => {
  try {
    // 사용자 이메일 정보를 가져옵니다.
    const userEmail = await getUserEmailFromToken(req);
    const query = oracleDB.monthQuery();
    const result = await executeQuery(query, { Email: userEmail });

    // Convert the query result to an array
    const data = result.rows.map(row => row[0]);

    // Send the data as JSON
    res.json(data);
  } catch (err) {
    res.status(500).send('Error retrieving data');
  }
});

// Year query handler
app.get('/yearquery', async (req, res) => {
  try {
    // 사용자 이메일 정보를 가져옵니다.
    const userEmail = await getUserEmailFromToken(req);
    const query = oracleDB.yearQuery();
    const result = await executeQuery(query, { Email: userEmail });

    // Convert the query result to an array
    const data = result.rows.map(row => row[0]);

    // Send the data as JSON
    res.json(data);
  } catch (err) {
    res.status(500).send('Error retrieving data');
  }
});

// Hourly chart handler
app.get('/hourlychartquery', async (req, res) => {
  try {
    // 사용자 이메일 정보를 가져옵니다.
    const userEmail = await getUserEmailFromToken(req);

    const query = oracleDB.everyHourDuringTheDayQuery();
    const result = await executeQuery(query, { Email: userEmail });

    // Convert the query result to an array
    const data = result.rows.map(row => [row[0], row[1]]);

    // Send the data as JSON
    res.json(data);
  } catch (err) {
    res.status(500).send('Error retrieving data');
  }
});


// Create a WebSocket server at port 13389
//const wss = new WebSocket.Server({ noServer: true });


// Start the HTTP server on port 8081
app.listen(PORT, () => {
    console.log(`HTTP server is running on port ${PORT_HTTP}`);
    console.log(`server is running on port ${PORT}`);
});
