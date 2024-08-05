const oracleDB = require('./oracledb.js');
const { getUserInfo } = require("./google_authController.js");

async function executeQuery(query, params) {
  const connection = await oracleDB.connectToOracleDB(); // 데이터베이스 연결
  try {
    const result = await connection.execute(query, params); // 쿼리 실행
    await connection.close(); // 연결 종료
    return result; // 쿼리 결과 반환
  } catch (err) {
    console.error('Error executing query:', err); // 오류 로그 출력
    await connection.close(); // 연결 종료
    throw err; // 오류를 호출자에게 전달
  }
}

async function getUserEmailFromToken(req) {
  const accessToken = req.cookies.accessToken; // 요청 쿠키에서 액세스 토큰 추출
  if (!accessToken) {
    throw new Error('Access token is missing'); // 액세스 토큰이 없으면 오류 발생
  }
  const userInfo = await getUserInfo(accessToken); // 액세스 토큰을 사용하여 사용자 정보 가져오기
  console.log('userInfo : ', userInfo.email.split('@')[0]); // 이메일 도메인 부분을 제거한 사용자 이메일 로그 출력
  return userInfo.email.split('@')[0]; // 이메일의 도메인 부분을 제거한 이메일 반환
}

module.exports = {
  executeQuery,
  getUserEmailFromToken,
};
