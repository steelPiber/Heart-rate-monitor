const express = require("express");
const router = express.Router();
const axios = require("axios");
const url = require("url");
const static = require('serve-static');
const path = require('path');
const oracleDB = require('./oracledb.js');
const session = require('express-session');

router.use(express.urlencoded({ extended: true }));
router.use(express.json());

router.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: true,
    maxAge: 1000 * 60 * 60,
    httpOnly: true
  }
}));


require("dotenv").config();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const AUTHORIZE_URI = "https://accounts.google.com/o/oauth2/v2/auth";
const REDIRECT_URL = "https://heartrate.ddns.net/login"; // 수정된 부분
const RESPONSE_TYPE = "code";
const SCOPE = "openid%20profile%20email";
const ACCESS_TYPE = "offline";
const OAUTH_URL = `${AUTHORIZE_URI}?client_id=${CLIENT_ID}&response_type=${RESPONSE_TYPE}&redirect_uri=${REDIRECT_URL}&scope=${SCOPE}&access_type=${ACCESS_TYPE}&prompt=consent`;

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

router.get("/auth/google", (req, res) => {
  res.redirect(OAUTH_URL);
});

router.get("/login", async (req, res) => {
  const code = req.query.code;
  if (code) {
    try {
      const accessToken = await getToken(code);
      const userInfo = await getUserInfo(accessToken);
      const userEmail = userInfo.email;
      const userEmailWithoutDomain = userEmail.split('@')[0];
      const userProfileUrl = userInfo.picture; // 구글 프로필 URL

      // 세션에 사용자 정보를 저장
      req.session.user = {
        email: userEmail,
        profile: userProfileUrl
      };

      // 세션 저장 후 로그 기록을 위한 함수 호출
      await oracleDB.selectUserlog(userEmailWithoutDomain);
      
      // 리디렉션
      res.redirect(`${REDIRECT_URL}/${userEmailWithoutDomain}`);
    } catch (error) {
      console.error("Error retrieving user info:", error);
      res.status(500).send("Error retrieving user info");
    }
  } else {
    res.status(400).send("Code parameter missing");
  }
});

// 로그아웃 라우터 수정
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
