const { spawn } = require('child_process');
const express = require("express");
const router = express.Router();

router.get('/nginx-status', (req, res) => {
  const status = spawn('systemctl', ['status', 'nginx']);

  // 명령어의 출력을 실시간으로 읽어오기
  let output = '';
  status.stdout.on('data', (data) => {
    output += data.toString();
  });

  status.stderr.on('data', (data) => {
    output += data.toString();
  });

  status.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
    // 'Active:'로 시작하는 행을 추출하고 'since' 이전까지만 표시
    const activeMatch = output.match(/Active:.*?(?= since)/);
    const activeStatus = activeMatch ? activeMatch[0] : 'Status not found';
    
    // 상태에 따라 HTML을 생성
    let color = 'grey';
    if (activeStatus.includes('active (running)')) {
      color = 'green';
    } else if (activeStatus.includes('failed')) {
      color = 'red';
    }

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nginx Status</title>
        <style>
          .status-indicator {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background-color: ${color};
            display: inline-block;
            margin-right: 10px;
          }
          .status-text {
            font-size: 1.2em;
          }
        </style>
      </head>
      <body>
        <div class="status-container">
          <div class="status-indicator"></div>
          <div class="status-text">Nginx status ${activeStatus}</div>
        </div>
      </body>
      </html>
    `;

    res.send(html);
  });
});
module.exports = router;
