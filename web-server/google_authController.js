const { default: axios } = require("axios");
const express = require("express");
const router = express.Router();
const url = require("url");
const static = require('serve-static');
const path = require('path');
const oracleDB = require('./oracledb.js');
router.use(express.urlencoded({extended:true}));
router.use(express.json());
router.use('/public', static(path.join(__dirname, 'public')));

require("dotenv").config();

// NOTE process.env는 dotenv라이브러리 사용
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const AUTHORIZE_URI = "https://accounts.google.com/o/oauth2/v2/auth";
const REDIRECT_URL = "http://heartrate.ddns.net"; // 수정된 부분
const RESPONSE_TYPE = "code";
const SCOPE = "openid%20profile%20email";
const ACCESS_TYPE = "offline";
const OAUTH_URL = `${AUTHORIZE_URI}?client_id=${CLIENT_ID}&response_type=${RESPONSE_TYPE}&redirect_uri=${REDIRECT_URL}&scope=${SCOPE}&access_type=${ACCESS_TYPE}`;

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

// NOTE 버튼 클릭시 구글 로그인 화면으로 이동
router.get("/auth/google", (req, res) => {
  res.redirect(OAUTH_URL);
});

// 사용자의 리디렉션 URL 처리
// 사용자의 리디렉션 URL 처리
router.get("/", async (req, res) => {
  const code = req.query.code;
  if (code) {
    try {
      // 코드를 사용하여 액세스 토큰 가져오기
      const accessToken = await getToken(code);
      // 액세스 토큰을 사용하여 사용자 정보 가져오기
      const userInfo = await getUserInfo(accessToken);
      // 사용자 이메일 정보를 가져옵니다.
      const userEmail = userInfo.email;
      // @를 기준으로 사용자 이메일을 처리하여 @gmail.com을 제거합니다.
      const userEmailWithoutDomain = userEmail.split('@')[0];
      // 사용자 이메일 정보를 기반으로 리다이렉션 URL 생성
      res.redirect(`/`); // 수정된 부분
      await oracleDB.selectUserlog(userEmailWithoutDomain);
    } catch (error) {
      // 오류를 캐치하여 처리
      console.error("Error retrieving user info:", error);
      res.status(500).send("Error retrieving user info");
    }
  } else {
    res.status(400).send("Code parameter missing");
  }
});

module.exports = router;
