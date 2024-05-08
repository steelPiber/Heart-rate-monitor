const { default: axios } = require("axios");
const express = require("express");
const router = express.Router();
const url = require("url");
const static = require('serve-static');
const path = require('path');
router.use(express.urlencoded({extended:true}));
router.use(express.json());
router.use('/public', static(path.join(__dirname, 'public')));


require("dotenv").config();

// NOTE process.env는 dotenv라이브러리 사용
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const AUTHORIZE_URI = "https://accounts.google.com/o/oauth2/v2/auth";
const REDIRECT_URL = "http://heartrate.ddns.net";
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

// NOTE 버튼 클릭시 구글 로그인 화면으로 이동
router.get("/auth/google", (req, res) => {
  res.redirect(OAUTH_URL);
});

module.exports = router;
