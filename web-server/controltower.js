const { spawn } = require('child_process');
const express = require('express');
const router = express.Router();
const oracleDB = require('./oracledb.js');
const fs = require('fs');
const path = require('path');

let oracleStatus = 'Status not checked yet';
let oracleColor = 'grey';

let nginxStatus = 'Status not checked yet';
let nginxColor = 'grey';

// 로그 파일 경로
const logFilePath = '/var/log/auth.log';

// oracledb status 확인
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

// 로그 파일에서 "Failed password" 항목을 읽어오는 함수
function getFailedPasswordLogs(callback) {
  fs.readFile(logFilePath, 'utf8', (err, data) => {
    if (err) {
      callback(err, null);
      return;
    }
    const lines = data.trim().split('\n');
    const failedPasswordLogs = lines.filter(line => line.includes('Failed password'));
    callback(null, failedPasswordLogs);
  });
}

// 처음 서버가 시작할 때 상태를 확인하고 일정 시간마다 상태를 확인하도록 설정
checkOracleStatus();
checkNginxStatus();
setInterval(checkOracleStatus, 10000); // 10초마다 상태 확인
setInterval(checkNginxStatus, 10000);  // 10초마다 상태 확인

router.get('/control', (req, res) => {
  getFailedPasswordLogs((err, failedPasswordLogs) => {
    if (err) {
      failedPasswordLogs = ['Error reading log file'];
    }

    const failedPasswordLogsHtml = failedPasswordLogs.map(log => `<div class="log-entry">${log}</div>`).join('');

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
          .log-container {
            margin-top: 20px;
          }
          .log-entry {
            margin-bottom: 5px;
            font-family: monospace;
            white-space: pre-wrap;
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
        <div class="log-container">
          <h3>Failed Password Logs:</h3>
          ${failedPasswordLogsHtml}
        </div>
      </body>
      </html>
    `;

    res.send(html);
  });
});

module.exports = router;
