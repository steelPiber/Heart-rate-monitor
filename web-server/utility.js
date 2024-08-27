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

module.exports = {
  executeQuery,
};
