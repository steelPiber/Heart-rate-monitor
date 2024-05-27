// oracledb.js
console.log(`VERSION_ORACLEDB_0.1_12.01`);
console.log(`0.1 : oracledb.js 모듈 분리`);

// oracledb에 모듈 추가
const oracledb = require('oracledb');
const nodemailer = require('./mail_auth.js');

// Oracle DB 연결 구성
const dbConfig = {
  user: 'piber',
  password: 'wjsansrk',
  connectString: '202.31.243.45:1521/ORA21'
};

//Oracle DB 연결확인
async function connectToOracleDB() {
  try {
    const connection = await oracledb.getConnection(dbConfig);
    return connection;
  } catch (error) {
    console.error('Oracle DB 연결오류:', error);
    throw error;
  }
}

// BPM데이터를 Oracle DB에 삽입
async function insertBPMData(bpm, email, tag) {
  const connection = await connectToOracleDB();

  try {
    const insertSQL = 'INSERT INTO bpmdata(ID, BPM, TIME, EMAIL, TAG) VALUES (BPM_SEQ.NEXTVAL, :bpm, CURRENT_TIMESTAMP, :email, :tag)';
    const bindParams = {
      bpm: bpmValue,
      email: email,
      tag: tag,
    };
    const options = {
      autoCommit: true, //자동 커밋 활성화 
    };

    const result = await connection.execute(insertSQL, bindParams, options);
    console.log('BPM 데이터 삽입:', result);
  } catch (error) {
    console.error('BPM 데이터 삽입 오류:', error);
  } finally {
    await connection.close();
  }
}

//회원가입시 ID중복 검사 및 인증 메일 발송
async function checkUserEmailExists(userEmail) {
    const connection = await connectToOracleDB();
    try {
        const selectquery = 'SELECT COUNT(*) AS count FROM USER_TABLE WHERE EMAIL = :Email';
        const data = {
            Email: userEmail
        }
        // 사용자가 존재하는지 확인하는 쿼리 실행
        const result = await connection.execute(selectquery, data, { outFormat: oracledb.OBJECT });

        // 사용자가 존재하지 않는 경우에만 메일을 보내고 삽입
        if (result.rows[0].COUNT === 0) {
            // 이메일을 보내고, 인증 코드를 가져오기
            const rand_code = await nodemailer.sendVerificationEmail(userEmail);
	    console.log("rand_code: ", rand_code); 
            // 인증 코드를 사용하여 메일 테이블에 삽입
            const insertquery = 'INSERT INTO mail_auth_code (idx, user_email_id, auth_date, auth_code) VALUES (mail_auth_seq.nextval, :userEmail, SYSTIMESTAMP, :rand_code)';
            const insertData = {
                userEmail: userEmail,
                rand_code: rand_code
            };
            // 삽입 쿼리 실행
            await connection.execute(insertquery, insertData, { autoCommit: true });
        }
        // 사용자가 존재하는지 여부 반환
        return result.rows[0].COUNT > 0;
    } catch (error) {
        console.error('Error checking user exists:', error);
    } finally {
        await connection.close();
    }
}
//mail_auth_code 확인 검사
async function checkMailAuth(paramEmail, paramauth_code){
    const connection = await connectToOracleDB();
    try {
        const query = 'SELECT * FROM ( SELECT IDX, USER_EMAIL_ID, AUTH_DATE, AUTH_CODE, RANK() OVER (PARTITION BY USER_EMAIL_ID ORDER BY IDX DESC) AS RNK FROM MAIL_AUTH_CODE WHERE USER_EMAIL_ID = :userEmail ) WHERE RNK = 1 AND AUTH_CODE = :auth_code';
        const data = {
            userEmail: paramEmail,
            auth_code: paramauth_code
        };
        const result = await connection.execute(query, data, { outFormat: oracledb.OBJECT });
        console.log('checking auth code successfully');
        
        return result.rows.length > 0;
    } catch (error) {
        console.error('Error checking auth code:', error);
    } finally {
        await connection.close();
    }
}
//회원가입시 user의 닉네임 중복검사
async function checkUserNickExists(userNick) {
    const connection = await connectToOracleDB();
    try {
        const query = 'SELECT COUNT(*) AS count FROM USER_TABLE WHERE NAME = :Nick';
	const data = {
	     Nick: userNick
	}
        const result = await connection.execute(query, data, { outFormat: oracledb.OBJECT });
        return result.rows[0].COUNT > 0;
    } catch (error) {
        console.error('Error checking user exists:', error);
    } finally {
        await connection.close();
    }
}

async function insertUserlog(paramEmail, paramNickname) {
    const connection = await connectToOracleDB();
    try {
        const insertlogSQL = `INSERT INTO sign_up_log_access (idx, sign_up_date, user_email_id, user_name) VALUES (sign_up_idx_log_access_seq.nextval, SYSTIMESTAMP, :userEmail, :username)`;
	const data = {
            userEmail: paramEmail,
            username: paramNickname,
        };
        const result_log = await connection.execute(insertlogSQL, data, { autoCommit: true }); // 회원가입 로그 삽입
        console.log('User_log inserted successfully');
    } catch (error) {
        console.error('Error inserting user_log:', error);
    } finally {
        try {
            await connection.close(); // 연결 닫기
        } catch (closeError) {
            console.error('Error closing the connection:', closeError);
        }
    }
}
async function insertUserErrlog(paramEmail, paramNickname){
	const connection = await connectToOracleDB();

	try {
        const insertlogerrSQL = `INSERT INTO sign_up_log_error (idx, sign_up_date, user_email_id, user_name) VALUES (sign_up_idx_log_error_seq.nextval, SYSTIMESTAMP, :userEmail, :username)`;
	const data = {
            userEmail: paramEmail,
            username: paramNickname,
        };
        const result_log = await connection.execute(insertlogerrSQL, data, { autoCommit: true });
        console.log('Error log inserted successfully');
    } catch (error) {
        console.error('Error inserting user_error_log:', error);
    } finally {
        try {
            await connection.close(); // 연결 닫기
        } catch (closeError) {
            console.error('Error closing the connection:', closeError);
        }
    }
}

// USER데이터를 Oracle DB에 삽입
async function insertUser(paramEmail, paramname, paramNickname, paramPw) {
    const connection = await connectToOracleDB();
    try {
        const insertSQL = `INSERT INTO USER_TABLE(EMAIL, NAME, USERNAME, PASSWORD) VALUES (:userEmail, :userRealname, :username, :userPassword)`;
        const data = {
            userEmail: paramEmail,
            userRealname: paramname,
	    username: paramNickname,
            userPassword: paramPw,
        };
        const result = await connection.execute(insertSQL, data, { autoCommit: true }); // 사용자 정보 삽입
        console.log('User inserted successfully');
    } catch (error) {
        console.error('Error inserting user:', error);
    } finally {
        try {
            await connection.close(); // 연결 닫기
        } catch (closeError) {
            console.error('Error closing the connection:', closeError);
        }
    }
}
// 로그인 처리 함수
async function selectUser(paramEmail, paramPw){
    const connection = await connectToOracleDB();
    try{
    	const selectSQL = 'SELECT COUNT(*) AS count FROM USER_TABLE WHERE EMAIL = :userEmail AND PASSWORD = :userPassword';
    	const data = {
	    userEmail: paramEmail,
            userPassword: paramPw,
    	};
	const result = await connection.execute(selectSQL, data, { outFormat: oracledb.OBJECT });
        return result.rows[0].COUNT > 0;
    }catch (error) {
        console.error('Error login failed:', error);
    } finally {
        await connection.close();
    }
}
async function selectUserlog(paramEmail){
     const connection = await connectToOracleDB();
     try {
     	const query = 'INSERT INTO SIGN_IN_LOG_ACCESS(IDX, SIGN_IN_DATE, USER_EMAIL_ID) VALUES (sign_in_idx_log_access_seq.nextval, SYSTIMESTAMP, :Email)';
	const data = {
		Email: paramEmail
	};
	const result = await connection.execute(query, data, { autoCommit: true });
	console.log('insert sign in log successfully');
     }catch (error){
     	console.error('Error inserting sign in log');
     } finally {
     	await connection.close();
     }
}
async function selectUserErrlog(paramEmail){
     const connection = await connectToOracleDB();
     try {
     	const query = 'INSERT INTO SIGN_IN_LOG_ERROR(IDX, SIGN_IN_DATE, USER_EMAIL_ID) VALUES (sign_in_idx_log_error_seq.nextval, SYSTIMESTAMP, :Email)';
	const data = {
		Email: paramEmail
	};
	const result = await connection.execute(query, data, { autoCommit: true });
	console.log('insert sign in error log successfully');
     }catch (error){
     	console.error('Error inserting sign in error log');
     } finally {
     	await connection.close();
     }
}

// 이 SQL 쿼리는 bpmdata 테이블에서 최근 1분 동안의 데이터를 기반으로 1분 단위로 묶어 평균 심박수를 계산하는 것을 목적으로 합니다.

/*    SELECT: 조회할 열들을 지정합니다.
        TO_CHAR(TRUNC(TIME, 'MI'), 'YYYYMMDDHH24MI') AS minute_time: 시간을 분 단위로 잘라서 연, 월, 일, 시, 분까지 나타내는 문자열 형태로 변환합니다. 이를 minute_time이라는 이름의 열로 선택합니다.
        ROUND(AVG(BPM)) AS avg_bpm: BPM 열의 값을 평균을 구한 후, 그 값을 반올림하여 avg_bpm이라는 이름의 열로 선택합니다.
    FROM bpmdata: 데이터를 조회할 테이블을 지정합니다. 이 경우에는 bpmdata라는 테이블에서 데이터를 가져옵니다.
    WHERE TIME >= SYSTIMESTAMP - INTERVAL '1' MINUTE: 현재 시간(SYSTIMESTAMP)에서 1분 전까지의 데이터만 가져옵니다.
    GROUP BY TO_CHAR(TRUNC(TIME, 'MI'), 'YYYYMMDDHH24MI'): 시간을 분 단위로 자른 후, 해당 시간 기준으로 그룹화하여 평균을 계산합니다.
    */
    
/*
  // 1분 동안의 쿼리 
const query = `
  SELECT TO_CHAR(TRUNC(TIME, 'MI'), 'YYYYMMDDHH24MI') AS minute_time, ROUND(AVG(BPM)) AS avg_bpm
  FROM bpmdata
  WHERE TIME >= SYSTIMESTAMP - INTERVAL '1' MINUTE
  GROUP BY TO_CHAR(TRUNC(TIME, 'MI'), 'YYYYMMDDHH24MI')
`;
*/


function realtimeQuery() {
  return `SELECT ROUND(bpm) FROM bpmdata WHERE email = :Email ORDER BY time FETCH FIRST 1 ROWS ONLY`;
}

function minQuery() {
  return `SELECT ROUND(AVG(bpm)) AS avg_bpm FROM bpmdata WHERE email = :Email AND time > (SELECT MAX(time) - INTERVAL '1' MINUTE FROM bpmdata WHERE email = :Email)`;
}

function hourQuery() {
  return `SELECT ROUND(AVG(bpm)) AS avg_bpm FROM bpmdata WHERE email = :Email AND time > (SELECT MAX(time) - INTERVAL '1' HOUR FROM bpmdata WHERE email = :Email)`;
}

function dayQuery() {
  return `SELECT ROUND(AVG(bpm)) AS avg_bpm FROM bpmdata WHERE email = :Email AND time > (SELECT MAX(time) - INTERVAL '1' DAY FROM bpmdata WHERE email = :Email)`;
}

function monthQuery() {
  return `SELECT ROUND(AVG(bpm)) AS avg_bpm FROM bpmdata WHERE email = :Email AND time > (SELECT MAX(time) - INTERVAL '1' MONTH FROM bpmdata WHERE email = :Email)`;
}

function yearQuery() {
  return `SELECT ROUND(AVG(bpm)) AS avg_bpm FROM bpmdata WHERE email = :Email AND time > (SELECT MAX(time) - INTERVAL '1' YEAR FROM bpmdata WHERE email = :Email)`;
}

function everyHourDuringTheDayQuery() {
  return `SELECT TO_CHAR(time, 'YYYY-MM-DD HH24') AS hour, ROUND(AVG(bpm)) AS avg_bpm 
          FROM bpmdata 
          WHERE email = :Email 
          AND time > (SELECT MAX(time) - INTERVAL '1' DAY FROM bpmdata WHERE email = :Email) 
          GROUP BY TO_CHAR(time, 'YYYY-MM-DD HH24') 
          ORDER BY hour`;
}

function everyHourDuringTheDayQuery() {
  return `SELECT TO_CHAR(time, 'YYYY-MM-DD HH24') AS hour, ROUND(AVG(bpm)) AS avg_bpm 
          FROM bpmdata 
          WHERE email = :Email 
          AND time > (SELECT MAX(time) - INTERVAL '1' DAY FROM bpmdata WHERE email = :Email) 
          GROUP BY TO_CHAR(time, 'YYYY-MM-DD HH24') 
          ORDER BY hour`;
}



module.exports = {
  connectToOracleDB,
  insertBPMData,
  checkUserEmailExists,
  checkUserNickExists,	
  checkMailAuth,
  insertUser,
  insertUserlog,
  insertUserErrlog,
  selectUser,
  selectUserlog,
  selectUserErrlog,
  realtimeQuery,
  minQuery,
  hourQuery,
  dayQuery,
  monthQuery,
  yearQuery,
  everyHourDuringTheDayQuery,
};
