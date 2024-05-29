const { spawn } = require('child_process');
const express = require("express");
const router = express.Router();

router.get('/top', (req, res) => {
  const top = spawn('top', ['-b', '-n', '1']);

  top.stdout.on('data', (data) => {
    res.write(data);
  });

  top.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
    res.write(`stderr: ${data}`);
  });

  top.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
    res.end();
  });
});
