const express = require("express");
const path = require('path');
const axios = require("axios");
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const oracleDB = require('./oracledb.js'); // Oracle DB 모듈

const router = express.Router(); 

require("dotenv").config();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const AUTHORIZE_URI = "https://accounts.google.com/o/oauth2/v2/auth";
const REDIRECT_URL = "https://heartrate.ddns.net/login";
const RESPONSE_TYPE = "code";
const SCOPE = "openid%20profile%20email";
const ACCESS_TYPE = "offline";
const OAUTH_URL = `${AUTHORIZE_URI}?client_id=${CLIENT_ID}&response_type=${RESPONSE_TYPE}&redirect_uri=${REDIRECT_URL}&scope=${SCOPE}&access_type=${ACCESS_TYPE}&prompt=consent`;

// 액세스 토큰을 가져오는 함수
const getToken = async (code) => {
  try {
    const tokenApi = await axios.post(
      `https://oauth2.googleapis.com/token?code=${code}&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&redirect_uri=${REDIRECT_URL}&grant_type=authorization_code`
    );
    return tokenApi.data.access_token;
  } catch (err) {
    console.error("Error fetching token:", err);
    throw err;
  }
};

// 사용자 정보를 가져오는 함수
const getUserInfo = async (accessToken) => {
  try {
    const userInfoApi = await axios.get(
      `https://www.googleapis.com/oauth2/v2/userinfo`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
    return userInfoApi.data;
  } catch (err) {
    console.error("Error fetching user info:", err);
    throw err;
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

      // OTP 시크릿이 존재하는지 확인
      const existingSecret = await oracleDB.getOTPSecret(userEmail);

      // 시크릿이 존재하지 않는 경우에만 새로 생성
      if (!existingSecret) {
        // OTP 시크릿 생성 및 DB에 저장
        const secret = speakeasy.generateSecret({ name: `MyApp (${userEmail})` });
        // Oracle DB에 OTP 시크릿 저장
        await oracleDB.insertOTPSecret(userEmail, secret.base32);

        // QR 코드 생성
        const otpauthUrl = secret.otpauth_url;
        qrcode.toDataURL(otpauthUrl, (err, dataUrl) => {
          if (err) {
            console.error("Error generating QR code:", err);
            return res.status(500).send("Error generating QR code");
          }

          // 'otp.ejs' 파일을 렌더링하며 QR 코드와 이메일 데이터를 전달
          res.render('otp', { qrCodeUrl: dataUrl, email: userEmail });
        });

      } else {
        // 기존 시크릿이 있는 경우, QR 코드를 다시 생성할 수도 있지만,
        // 이 경우 QR 코드 생성을 생략하거나 알림을 띄울 수 있습니다.
        res.render('otp', { qrCodeUrl: null, email: userEmail });
      }

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

  try {
    // 저장된 시크릿 가져오기 (Oracle DB에서)
    const secret = await oracleDB.getOTPSecret(email);

    // OTP 검증
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 1 // 시간 오차를 고려한 윈도우 설정
    });

    if (verified) {
      // 세션에 사용자 정보 저장
      req.session.user = { email: email };

      const userEmailWithoutDomain = email.split('@')[0];
      await oracleDB.selectUserlog(userEmailWithoutDomain);
      res.json({ success: true, redirectUrl: `${REDIRECT_URL}/${userEmailWithoutDomain}` });
    } else {
      res.status(400).send();
    }
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ error: "Error verifying OTP" });
  }
});
//OTP QR코드 재생성
router.post('/regenerate-otp', async (req, res) => {
  const { email } = req.body;

  try {
    // OTP 시크릿 삭제
    await oracleDB.deleteOTPSecret(email);

    // 새로운 OTP 시크릿 생성
    const secret = speakeasy.generateSecret({ name: `MyApp (${email})` });
    console.log('Generated secret:', secret.base32); // 디버깅: 생성된 시크릿 확인

    // Oracle DB에 새로운 OTP 시크릿 저장
    await oracleDB.insertOTPSecret(email, secret.base32);

    // 새로운 QR 코드 생성
    const otpauthUrl = secret.otpauth_url;
    qrcode.toDataURL(otpauthUrl, (err, dataUrl) => {
      if (err) {
        console.error("Error generating QR code:", err);
        return res.status(500).json({ error: "Error generating QR code" });
      }

      // 새로운 QR 코드 URL을 클라이언트에 반환
      res.json({ success: true, qrCodeUrl: dataUrl });
    });

  } catch (error) {
    console.error("Error regenerating OTP:", error);
    res.status(500).json({ error: "Error regenerating OTP" });
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
    const userProfileUrl = req.session.user.profile;
    res.json({ userProfileUrl });
  } catch (error) {
    console.error("Error retrieving user profile:", error);
    res.status(500).json({ error: "Failed to retrieve user profile" });
  }
});

module.exports = { router: router, getUserInfo };
