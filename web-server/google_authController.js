const { default: axios } = require("axios");
const express = require("express");
const router = express.Router();
const url = require("url");
const path = require('path');
const oracleDB = require('./oracledb.js');

router.use(express.urlencoded({extended:true}));
router.use(express.json());

require("dotenv").config();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const AUTHORIZE_URI = "https://accounts.google.com/o/oauth2/v2/auth";
const REDIRECT_URL = "https://heartrate.ddns.net/login"; 
const RESPONSE_TYPE = "code";
const SCOPE = "openid%20profile%20email";
const ACCESS_TYPE = "offline";
const OAUTH_URL = `${AUTHORIZE_URI}?client_id=${CLIENT_ID}&response_type=${RESPONSE_TYPE}&redirect_uri=${REDIRECT_URL}&scope=${SCOPE}&access_type=${ACCESS_TYPE}`;

const getToken = async (code) => {
  try {
    const tokenApi = await axios.post(
      `https://oauth2.googleapis.com/token?code=${code}&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&redirect_uri=${REDIRECT_URL}&grant_type=authorization_code`
    );
    return tokenApi.data.access_token;
  } catch (err) {
    throw new Error('Failed to retrieve access token');
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
    throw new Error('Failed to retrieve user info');
  }
};

const oauth2Api = async (code) => {
  try {
    const accessToken = await getToken(code);
    const userInfo = await getUserInfo(accessToken);
    const userEmail = userInfo.email;
    const userEmailWithoutDomain = userEmail.split('@')[0];
    
    await oracleDB.selectUserlog(userEmailWithoutDomain);
    return accessToken;
  } catch (error) {
    throw new Error('Failed to execute OAuth2 API');
  }
};

router.get("/auth/google", (req, res) => {
  res.redirect(OAUTH_URL);
});

router.get("/login", async (req, res) => {
  const query = url.parse(req.url, true).query;

  if (query && query.code) {
    try {
      const accessToken = await oauth2Api(code); // OAuth2 API 호출
      // Set the access token as an HTTP-only cookie
      res.cookie('accessToken', accessToken, { httpOnly: true, secure: true, sameSite: 'None' });
      res.send("");
    } catch (error) {
      console.error("Error retrieving user info:", error);
      res.status(500).send("Error retrieving user info");
    }
  } else {
    res.status(400).send("Code parameter missing");
  }
});

module.exports = { router, getUserInfo };
