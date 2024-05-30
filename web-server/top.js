const { spawn } = require('child_process');
const express = require("express");
const router = express.Router();

let cachedStatus = 'Status not checked yet';
let cachedColor = 'grey';

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

    let color = 'grey';
    if (activeStatus.includes('active (running)')) {
      color = 'green';
    } else if (activeStatus.includes('failed')) {
      color = 'red';
    }

    cachedStatus = activeStatus;
    cachedColor = color;
  });
}

// 처음 서버가 시작할 때 상태를 확인하고 일정 시간마다 상태를 확인하도록 설정
checkNginxStatus();
setInterval(checkNginxStatus, 10000); // 5초마다 상태 확인

router.get('/nginx-status', (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Nginx Status</title>
      <style>
        .status-container {
          display: flex;
          align-items: center;
        }
        .status-indicator {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background-color: ${cachedColor};
          display: inline-block;
          margin-left: 10px;
        }
        .status-text {
          font-size: 1.2em;
        }
      </style>
    </head>
    <body>
      <div class="status-container">
        <div class="status-text">${cachedStatus}</div>
        <div class="status-indicator"></div>
      </div>
    </body>
    </html>
  `;

  res.send(html);
});

module.exports = router;
