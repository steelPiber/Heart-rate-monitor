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
    res.send(`<pre>${activeStatus}</pre>`);
  });
});
module.exports = router;
