const express = require('express');
const router = express.Router();
const static = require('serve-static');
const path = require('path');
const oracleDB = require('./firebase.js');
router.use(express.urlencoded({extended:true}));
router.use(express.json());
router.use('/public', static(path.join(__dirname, 'public')));

router.post('/verify-token', async (req, res) => {
  const idToken = req.body.idToken; // 클라이언트에서 보낸 ID 토큰
  try {
    const decodedToken = await verifyGoogleToken(idToken);
    // 토큰 검증 성공, 메인 페이지로 리디렉션
    return res.redirect('/main');
  } catch (error) {
    console.error('Token verification failed', error);
    // 토큰 검증 실패, 에러 페이지 또는 로그인 페이지로 리디렉션
    return res.redirect('/login');
  }
});
