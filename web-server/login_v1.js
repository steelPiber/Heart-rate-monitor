const fs = require('fs');
const oracledb = require('oracledb');

const userid = 'user123';
const userpasswd = 'sfasf';
// 유저아이디와 비밀번호를 받아와야함

const dbConfig = {
  user: 'piber',
  password: 'wjsansrk',
  connectString: '202.31.243.45:1521/ORA21'
};

async function connectToOracleDB() {
  try {
    const connection = await oracledb.getConnection(dbConfig);
    return connection;
  } catch (error) {
    console.error('Oracle DB 연결오류:', error);
    throw error;
  }
}
//DB연결

async function selectUser() {
  let connection;
  try {
    connection = await connectToOracleDB();
    
    const selectSQL = 'SELECT id, passwd FROM usertable WHERE id = :userid AND passwd = :userpasswd';
    const result = await connection.execute(selectSQL, { userid: userid, userpasswd: userpasswd });

    if (result.rows.length > 0) {
      console.log('로그인 성공');
      // 로그인 성공 로그를 기록
      logAccess(`${userid} 로그인 성공`);
    } else {
      console.log('사용자를 찾을 수 없음');
      // 로그인 실패 로그를 기록
      logError(`${userid} 로그인 실패`);
    }
  } catch (error) {
    console.error('오라클 DB 쿼리 오류:', error);
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error('Oracle DB 연결 종료 오류:', error);
      }
    }
  }
}

// id, passwd 유효성검사


function logAccess(message) {
  const logMessage = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFile('/var/log/Heart_log/access.log', logMessage, (err) => {
    if (err) {
      console.error('로그 기록 실패:', err);
    } else {
      console.log('로그 기록 성공:', message);
    }
  });
}
//로그인 성공 로그를 남기는 코드

function logError(message) {
  const logMessage = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFile('/var/log/Heart_log/error.log', logMessage, (err) => {
    if (err) {
      console.error('로그 기록 실패:', err);
    } else {
      console.log('로그 기록 성공:', message);
    }
  });
}
//로그인 실패 로그를 남기는 코드

selectUser();