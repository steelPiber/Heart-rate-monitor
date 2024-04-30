console.log(`firebase.js 모듈 분리`);

const admin = require('firebase-admin');

var serviceAccount = require('firebase_conf.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function verifyGoogleToken(idToken) {
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    // 사용자 정보를 가져오거나 필요한 작업 수행
    return decodedToken;
  } catch (error) {
    console.error('Error verifying Google token', error);
    throw error;
  }
}

let firebase = firebase.database();

module.exports = firebase;
