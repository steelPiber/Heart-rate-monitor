const express = require("express");
const router = express.Router();
const axios = require("axios");
const url = require("url");
const path = require('path');
const speakeasy = require('speakeasy'); // speakeasy 추가
const qrcode = require('qrcode'); // qrcode 추가
const oracleDB = require('./oracledb.js');

router.use(express.urlencoded({ extended: true }));
router.use(express.json());

require("dotenv").config();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const AUTHORIZE_URI = "https://accounts.google.com/o/oauth2/v2/auth";
const REDIRECT_URL = "https://heartrate.ddns.net/login"; 
const RESPONSE_TYPE = "code";
const SCOPE = "openid%20profile%20email";
const ACCESS_TYPE = "offline";
const OAUTH_URL = `${AUTHORIZE_URI}?client_id=${CLIENT_ID}&response_type=${RESPONSE_TYPE}&redirect_uri=${REDIRECT_URL}&scope=${SCOPE}&access_type=${ACCESS_TYPE}&prompt=consent`;

// OTP 생성 시크릿 저장소 (일반적으로 DB에 저장해야 함)
const otpSecrets = {};

// 액세스 토큰을 가져오는 함수
const getToken = async (code) => {
  try {
    const tokenApi = await axios.post(
      `https://oauth2.googleapis.com/token?code=${code}&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&redirect_uri=${REDIRECT_URL}&grant_type=authorization_code`
    );
    const accessToken = tokenApi.data.access_token;

    return accessToken;
  } catch (err) {
    return err;
  }
};

// 사용자 정보를 가져오는 함수
const getUserInfo = async (accessToken) => {
  try {
    const userInfoApi = await axios.get(
      `https://www.googleapis.com/oauth2/v2/userinfo`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    return userInfoApi.data;
  } catch (err) {
    return err;
  }
};

// Google OAuth 인증 페이지로 리디렉션
router.get("/auth/google", (req, res) => {
  res.redirect(OAUTH_URL);
});

// 로그인 라우터
router.get("/login", async (req, res) => {
  const code = req.query.code;
  if (code) {
    try {
      const accessToken = await getToken(code);
      const userInfo = await getUserInfo(accessToken);
      const userEmail = userInfo.email;
      const userEmailWithoutDomain = userEmail.split('@')[0];
      const userProfileUrl = userInfo.picture; // 구글 프로필 URL

      // OTP 시크릿 생성 및 저장 (일반적으로 DB에 저장)
      const secret = speakeasy.generateSecret({ name: `MyApp (${userEmail})` });
      otpSecrets[userEmail] = secret.base32;

      // QR 코드 생성
      const otpauthUrl = secret.otpauth_url;
      qrcode.toDataURL(otpauthUrl, (err, dataUrl) => {
        if (err) {
          console.error("Error generating QR code:", err);
          return res.status(500).send("Error generating QR code");
        }

        // QR 코드 페이지로 리디렉션
        res.render('otp', { qrCodeUrl: dataUrl, email: userEmail });
      });

    } catch (error) {
      console.error("Error retrieving user info:", error);
      res.status(500).send("Error retrieving user info");
    }
  } else {
    res.status(400).send("Code parameter missing");
  }
});

// OTP 확인 라우터
router.post("/verify-otp", async (req, res) => {
  const { email, token } = req.body;

  // 저장된 시크릿 가져오기
  const secret = otpSecrets[email];

  // OTP 검증
  const verified = speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token
  });

  if (verified) {
    // 세션에 사용자 정보 저장
    req.session.user = {
      email: email,
      profile: userProfileUrl
    };

    const userEmailWithoutDomain = email.split('@')[0];
    await oracleDB.selectUserlog(userEmailWithoutDomain);
    res.redirect(`${REDIRECT_URL}/${userEmailWithoutDomain}`);
  } else {
    res.status(400).send("Invalid OTP");
  }
});

router.get('/login/:userEmailWithoutDomain', (req, res) => {
  const userEmailWithoutDomain = req.params.userEmailWithoutDomain;
  res.redirect('/dashboard');
});

// 로그아웃 라우터
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.status(500).send("Error logging out");
    } else {
      res.redirect('https://heartrate.ddns.net');
    }
  });
});

router.get('/profile', async (req, res) => {
  try {
    userProfileUrl = req.session.user.profile;
    res.json({ userProfileUrl });
  } catch (error) {
    console.error("Error retrieving user profile:", error);
    res.status(500).json({ error: "Failed to retrieve user profile" });
  }
});

module.exports = { router, getUserInfo };
