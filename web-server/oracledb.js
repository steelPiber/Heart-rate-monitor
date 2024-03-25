// oracledb.js
console.log(`VERSION_ORACLEDB_0.1_12.01`);
console.log(`0.1 : oracledb.js 모듈 분리`);

// oracledb에 모듈 추가
const oracledb = require('oracledb');

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
async function insertBPMData(bpmValue) {
  const connection = await connectToOracleDB();

  try {
    const insertSQL = 'INSERT INTO bpmdata(ID, BPM, TIME) VALUES (BPM_SEQ.NEXTVAL, :bpm, CURRENT_TIMESTAMP)';
    const bindParams = {
      bpm: bpmValue,
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

//회원가입시 ID중복 검사
async function checkUserExists(userEmail) {
    const connection = await connectToOracleDB();
    try {
        const query = 'SELECT COUNT(*) AS count FROM USER_TABLE WHERE EMAIL = :Email';
	const data = {
	     Email: userEmail
	}
        const result = await connection.execute(query, data, { outFormat: oracledb.OBJECT });
        return result.rows[0].COUNT > 0;
    } catch (error) {
        console.error('Error checking user exists:', error);
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

// USER데이터를 Oracle DB에 삽입
async function insertUser(paramEmail, paramname, paramNickname, paramMac, paramPw) {
    const currentDate = new Date().toISOString();
    const connection = await connectToOracleDB();
    try{
        const insertSQL = `INSERT INTO USER_TABLE(EMAIL, NAME, USERNAME, MAC_ADDRESS, PASSWORD, EMAIL_AUTH) VALUES (:userEmail, :userRealname, :username, :userMac, :userPassword, :userEmailAuth)`;
        const insertlogtSQL = `INSERT INTO sign_up_log (idx, sign_up_date, user_email_id, user_name, mac_address) VALUES (sign_up_idx_seq.nextval, TO_TIMESTAMP('${currentDate}', 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"'), :userEmail, :username);`
	const data = {
	    userEmail: paramEmail,
            userRealname: paramname,
            username: paramNickname,
            userMac: paramMac,
            userPassword: paramPw,
            userEmailAuth: 0
        };
        const result = await connection.execute(insertSQL, data, { autoCommit: true }); // 자동 커밋 활성화
	const result_log = await connection.execute(insertlogSQL, data, { autoCommit: true });
        console.log('User inserted successfully');
    } catch (error) {
        console.error('Error inserting user:', error);
    } finally {
        try {
            await connection.close();
        } catch (closeError) {
            console.error('Error closing the connection:', closeError);
        }
    }
}

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

//실시간 쿼리

const realtime_query= `
	SELECT BPM
	FROM bpmdata
	ORDER BY TIME DESC
	FETCH FIRST 1 ROWS ONLY
`;
//1분 전의 쿼리 
const min1_query = `
SELECT TO_CHAR(TRUNC(TIME, 'MI'), 'YYYYMMDDHH24MI') AS minute_time, ROUND(AVG(BPM)) AS avg_bpm
FROM bpmdata
WHERE TIME >= SYSTIMESTAMP - INTERVAL '2' MINUTE AND TIME < SYSTIMESTAMP - INTERVAL '1' MINUTE
GROUP BY TO_CHAR(TRUNC(TIME, 'MI'), 'YYYYMMDDHH24MI')
`;

//현재 시간부터 1시간 전까지의 평균 BPM 값
const hour_query = `
SELECT ROUND(AVG(BPM)) AS avg_bpm
FROM bpmdata
WHERE TIME >= SYSTIMESTAMP - INTERVAL '60' MINUTE
	AND TIME <= SYSTIMESTAMP
`;

//1일동안의 1시간 평균 쿼리 
//x축 시간 :hour_time
//y축 BPM :avg_bpm
const hourly_query =`
SELECT TO_CHAR(TRUNC(TIME, 'HH'), 'YYYY-MM-DD HH24:MI') AS hour_time,
       ROUND(AVG(BPM)) AS avg_bpm
FROM bpmdata
WHERE TIME >= TRUNC(SYSDATE, 'DD')
      AND TIME < TRUNC(SYSDATE, 'DD') + INTERVAL '1' DAY
GROUP BY TO_CHAR(TRUNC(TIME, 'HH'), 'YYYY-MM-DD HH24:MI')
`;

const day_query =`
SELECT ROUND(AVG(BPM)) AS overall_avg_bpm
FROM bpmdata
WHERE TIME >= TRUNC(SYSDATE, 'DD')
	AND TIME < TRUNC(SYSDATE, 'DD') + INTERVAL '1' DAY
`;

module.exports = {
  connectToOracleDB,
  insertBPMData,
  checkUserExists,
  insertUser,
  selectUser,
  realtime_query,
  min1_query,
  hour_query,
  hourly_query,
  day_query,
};
