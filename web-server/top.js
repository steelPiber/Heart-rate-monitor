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
    // 'Active:'로 시작하는 행을 추출
    const activeLine = output.split('\n').find(line => line.trim().startsWith('Active:'));
    res.send(`<pre>${activeLine}</pre>`);
  });
});
module.exports = router;
