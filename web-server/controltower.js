const { spawn } = require('child_process');
const express = require('express');
const router = express.Router();
const oracleDB = require('./oracledb.js');
const fs = require('fs');
const chokidar = require('chokidar');

let unauthorizedLogs = [];
let oracleStatus = 'Status not checked yet';
let oracleColor = 'grey';

let nginxStatus = 'Status not checked yet';
let nginxColor = 'grey';

// 로그 파일 경로
const logFilePath = '/var/log/auth.log';

const allowedUsers = ['piber', 'root'];

// 새로운 로그 항목 처리 함수
function handleLog(log) {
  const loginRegex = /Accepted password\sfor\s(\S+)\sfrom\s([\d.]+)\sport\s(\d+)\s.*\s\d{4}-(\d{2}-\d{2})T(\d{2}):(\d{2}):\d{2}\.\d+\+\d{2}:\d{2}/;
  const match = log.match(loginRegex);

  if (match) {
    const user = match[1];
    const ip = match[2];
    const port = match[3];
    const monthAndDay = match[4];
    const hour = match[5];
    const minute = match[6];

    if (!allowedUsers.includes(user)) {
      console.log(`Unauthorized login detected from IP: ${ip}, user: ${user}, date: ${monthAndDay}, time: ${hour}:${minute}, port: ${port}`);
      unauthorizedLogs.push({ user, ip, port, monthAndDay, hour, minute });
    }
  }
}
//oracledb status 확인
function checkOracleStatus() {
  oracleDB.connectToOracleDB()
    .then(connection => {
      oracleStatus = 'Active: active (running)';
      oracleColor = 'green';
      // 필요 시 연결을 닫습니다.
      connection.close();
    })
    .catch(error => {
      oracleStatus = 'Active: failed';
      oracleColor = 'red';
    });
}
// Nginx status 확인
function checkNginxStatus() {
  const status = spawn('systemctl', ['status', 'nginx']);

  let output = '';
  status.stdout.on('data', (data) => {
    output += data.toString();
  });

  status.stderr.on('data', (data) => {
    output += data.toString();
  });

  status.on('close', (code) => {
    const activeMatch = output.match(/Active:.*?(?= since)/);
    const activeStatus = activeMatch ? activeMatch[0] : 'Status not found';

    nginxStatus = activeStatus;
    if (activeStatus.includes('active (running)')) {
      nginxColor = 'green';
    } else if (activeStatus.includes('failed')) {
      nginxColor = 'red';
    } else {
      nginxColor = 'grey';
    }
  });
}

// 로그 파일 모니터링
const watcher = chokidar.watch(logFilePath, {
  persistent: true,
  usePolling: true,
  interval: 1000
});

watcher.on('change', path => {
  fs.readFile(logFilePath, 'utf8', (err, data) => {
    if (err) {
      return console.log(err);
    }
    const logs = data.trim().split('\n');
    if (logs.length > 0) {
      handleLog(logs[logs.length - 1]); // 가장 마지막 로그 항목만 처리
    }
  });
});

// 처음 서버가 시작할 때 상태를 확인하고 일정 시간마다 상태를 확인하도록 설정
checkOracleStatus();
checkNginxStatus();
setInterval(checkOracleStatus, 10000); // 10초마다 상태 확인
setInterval(checkNginxStatus, 10000);  // 10초마다 상태 확인
router.get('/control', (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Service Status</title>
      <style>
        .status-container {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
        }
        .status-indicator {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background-color: grey;
          display: inline-block;
          margin-left: 10px;
        }
        .status-text {
          font-size: 1.2em;
        }
        .log-entry {
          margin-bottom: 5px;
        }
      </style>
    </head>
    <body>
      <div class="status-container">
        <div class="status-text">Nginx status: ${nginxStatus}</div>
        <div class="status-indicator" style="background-color: ${nginxColor};"></div>
      </div>
      <div class="status-container">
        <div class="status-text">OracleDB status: ${oracleStatus}</div>
        <div class="status-indicator" style="background-color: ${oracleColor};"></div>
      </div>
      <h3>Unauthorized Logs</h3>
      ${unauthorizedLogs.map(log => `
        <div class="log-entry">
          User: ${log.user}, IP: ${log.ip}, Port: ${log.port}, Date: ${log.monthAndDay}, Time: ${log.hour}:${log.minute}
        </div>
      `).join('')}
    </body>
    </html>
  `;

  res.send(html);
});

module.exports = router;
