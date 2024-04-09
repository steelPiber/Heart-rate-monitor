const express = require('express');
const router = express.Router();
const static = require('serve-static');
const path = require('path');
const oracleDB = require('./oracledb.js');
router.use(express.urlencoded({extended:true}));
router.use(express.json());
router.use('/public', static(path.join(__dirname, 'public')));

router.get('/checkEmailDuplicate', async (req, res) => {
    const userEmail = req.query.email; // 요청에서 사용자 이메일을 추출
    try {
      const Email_isDuplicate = await oracleDB.checkUserEmailExists(userEmail); // 사용자 이메일을 전달
      res.json({ Email_isDuplicate });
    } catch (error) {
      console.error('중복 확인 오류:', error);
      res.status(500).send('중복 확인 중 오류가 발생했습니다.');
    }
});

router.get('/checkNickDuplicate', async (req, res) => {
    const userNick = req.query.nickname; // 요청에서 사용자 이메일을 추출
    try {
      const Nick_isDuplicate = await oracleDB.checkUserNickExists(userNick); // 사용자 이메일을 전달
      res.json({ Nick_isDuplicate });
    } catch (error) {
      console.error('중복 확인 오류:', error);
      res.status(500).send('중복 확인 중 오류가 발생했습니다.');
    }
});

router.get('/checkCodeDuplicate', async (req, res) => {
    const userEmail = req.query.email;
    const auth_code = req.query.auth_code;
    try {
      const Code_isDuplicate = await oracleDB.checkMailAuth(userEmail, auth_code);
      res.json({ Code_isDuplicate });
    } catch (error) {
      console.error('인증 코드 확인 오류:', error);
      res.status(500).send('인증 코드 확인중 오류가 발생했습니다.');
    }
});

router.post('/signup', async (req, res)=> {
    const paramEmail = req.body.email;
    const paramname = req.body.username;
    const paramNickname = req.body.userNick;
    const paramauth_code = req.body.auth_code;
    const paramPw = req.body.userpasswd;
    console.log("paramEmail: ", paramEmail);
    console.log("paramname: ", paramname);
    console.log("paramNickname: ", paramNickname);
    console.log("paramauth_code: ", paramauth_code);
    console.log("paramPw: ", paramPw);
    try {
      await oracleDB.insertUser(paramEmail, paramname, paramNickname, paramauth_code, paramPw);
      await oracleDB.insertUserlog(paramEmail, paramNickname);
      res.status(200).send('회원가입 성공');
    } catch (err) {
      await oracleDB.insertUserErrlog(paramEmail, paramNickname, paramMac);
      res.status(500).send('회원가입 오류');
      console.error('회원가입 오류:', err);
    }
});

router.post('/signin', async (req, res)=> {
    const paramEmail = req.body.email;
    const paramPw = req.body.userpasswd;

    try {
        const isLoginSuccess = await oracleDB.selectUser(paramEmail, paramPw);
        if (isLoginSuccess) {
            await oracleDB.selectUserlog(paramEmail);
            res.status(200).send('로그인 성공');
        } else {
            await oracleDB.selectUserErrlog(paramEmail);
            res.status(401).send('이메일 또는 비밀번호가 잘못되었습니다.');
        }
    } catch (err) {
        res.status(500).send('로그인 오류');
        console.error('로그인 오류:' , err);
    }
});

module.exports = router;
