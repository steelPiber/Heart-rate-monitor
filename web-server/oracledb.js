// oracledb.js
console.log(`VERSION_ORACLEDB_0.1_12.01`);
console.log(`0.1 : oracledb.js 모듈 분리`);

// oracledb에 모듈 추가
const oracledb = require('oracledb');
//const nodemailer = require('./mail_auth.js');
//const pandas = require('pandas-js');
require('dotenv').config();

// Oracle DB 연결 구성
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECT
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
    const insertSQL = 'INSERT INTO bpmdata(IDX, BPM, TIME, EMAIL, TAG) VALUES (BPM_SEQ.NEXTVAL, :bpm, CURRENT_TIMESTAMP, :email, :tag)';
    const bindParams = {
      bpm: bpm,
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

// DB에서 최근 24시간 동안의 심박수 데이터 가져오기 -> hrv.js use a fun
async function fetchHeartRateData() {
    let connection;

    try {
        connection = await connectToOracleDB();

        const result = await connection.execute(
            `SELECT idx, bpm, time, email, tag
             FROM bpmdata
             WHERE time > (SELECT max(time) - INTERVAL '24' HOUR FROM bpmdata) 
               AND email='pyh5523' 
               AND bpm <> 0 
             ORDER BY time`
        );

        const data = result.rows.map(row => {
            return result.metaData.reduce((acc, meta, index) => {
                acc[meta.name.toUpperCase()] = row[index];
                return acc;
            }, {});
        });

        return data;
    } catch (err) {
        console.error("Error fetching heart rate data:", err);
        throw err;
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error("Error closing connection:", err);
            }
        }
    }
}
// OTP정보 계정별로 삽입
async function insertOTPSecret(email, secret) {
  const connection = await connectToOracleDB();

  try {
    const insertSQL = `
      INSERT INTO OTP_SECRETS (USER_EMAIL, OTP_SECRET, CREATED_AT) 
      VALUES (:email, :secret, SYSTIMESTAMP)
    `;
    const bindParams = {
      email: email,
      secret: secret,
    };
    const options = {
      autoCommit: true,
    };

    const result = await connection.execute(insertSQL, bindParams, options);
    console.log('OTP 시크릿 삽입:', result);
  } catch (error) {
    console.error('OTP 시크릿 삽입 오류:', error);
  } finally {
    await connection.close();
  }
}
// OTP정보 계정 조회
async function getOTPSecret(email) {
  const connection = await connectToOracleDB();

  try {
    const selectSQL = `
      SELECT OTP_SECRET 
      FROM OTP_SECRETS 
      WHERE USER_EMAIL = :email
    `;
    const result = await connection.execute(selectSQL, { email });
    return result.rows.length ? result.rows[0][0] : null;
  } catch (error) {
    console.error('OTP 시크릿 조회 오류:', error);
    throw error;
  } finally {
    await connection.close();
  }
}
// OTP정보 삭제
async function deleteOTPSecret(email) {
  const connection = await connectToOracleDB();

  try {
    const deleteSQL = `
      DELETE FROM OTP_SECRETS 
      WHERE USER_EMAIL = :email
    `;
    const bindParams = {
      email: email
    };
    const options = {
      autoCommit: true,
    };

    const result = await connection.execute(deleteSQL, bindParams, options);
    console.log('OTP 시크릿 삭제:', result);
  } catch (error) {
    console.error('OTP 시크릿 삭제 오류:', error);
  } finally {
    await connection.close();
  }
}

// 실시간 삼박수
function realtimeQuery() {
  return `SELECT ROUND(bpm) FROM bpmdata WHERE email = :Email ORDER BY time DESC FETCH FIRST 1 ROWS ONLY`;
}

// 1분 전 평균값
function minQuery() {
  return `SELECT ROUND(AVG(bpm)) AS avg_bpm FROM bpmdata WHERE email = :Email AND time > (SELECT MAX(time) - INTERVAL '1' MINUTE FROM bpmdata WHERE email = :Email)`;
}

// 1시간 전 평균값
function hourQuery() {
  return `SELECT ROUND(AVG(bpm)) AS avg_bpm FROM bpmdata WHERE email = :Email AND time > (SELECT MAX(time) - INTERVAL '1' HOUR FROM bpmdata WHERE email = :Email)`;
}

// 1일 전 평균값
function dayQuery() {
  return `SELECT ROUND(AVG(bpm)) AS avg_bpm FROM bpmdata WHERE email = :Email AND time > (SELECT MAX(time) - INTERVAL '1' DAY FROM bpmdata WHERE email = :Email)`;
}

// 1주일 전 평균값
function weekQuery() {
  return `SELECT ROUND(AVG(bpm)) AS avg_bpm FROM bpmdata WHERE email = :Email AND time > (SELECT MAX(time) - INTERVAL '7' DAY FROM bpmdata WHERE email = :Email)`;
}

// 1달 전 평균값
function monthQuery() {
  return `SELECT ROUND(AVG(bpm)) AS avg_bpm FROM bpmdata WHERE email = :Email AND time > (SELECT MAX(time) - INTERVAL '1' MONTH FROM bpmdata WHERE email = :Email)`;
}

// 1년 전 평균값
function yearQuery() {
  return `SELECT ROUND(AVG(bpm)) AS avg_bpm FROM bpmdata WHERE email = :Email AND time > (SELECT MAX(time) - INTERVAL '1' YEAR FROM bpmdata WHERE email = :Email)`;
}

// 1일 중 1시간 마다 평균값 그래프
function everyHourDuringTheDayQuery() {
  return `SELECT TO_CHAR(time, 'YYYY-MM-DD HH24') AS hour, ROUND(AVG(bpm)) AS avg_bpm 
          FROM bpmdata 
          WHERE email = :Email 
          AND time > (SELECT MAX(time) - INTERVAL '1' DAY FROM bpmdata WHERE email = :Email) 
          GROUP BY TO_CHAR(time, 'YYYY-MM-DD HH24') 
          ORDER BY hour`;
}

// 1주일 중 7시간 마다 평균값 그래프
function everySevenHourDuringTheWeekQuery() {
  return `SELECT TO_CHAR( 
  	  	TRUNC(time, 'DD') + INTERVAL '1' HOUR * (FLOOR((EXTRACT(HOUR FROM time) + MOD(EXTRACT(HOUR FROM time), 7)) / 7) * 7), 
          	'YYYY-MM-DD HH24'
    	  ) AS period, 
    	  ROUND(AVG(bpm)) AS avg_bpm 
	  FROM bpmdata 
	  WHERE email = :Email AND time > (SELECT MAX(time) - INTERVAL '7' DAY FROM bpmdata WHERE email = :Email) 
	  GROUP BY TO_CHAR(
        	 TRUNC(time, 'DD') + INTERVAL '1' HOUR * (FLOOR((EXTRACT(HOUR FROM time) + MOD(EXTRACT(HOUR FROM time), 7)) / 7) * 7), 
        	 'YYYY-MM-DD HH24'
    	  )
	  ORDER BY period`;
}

// 1달 중 1일 마다 평균값 그래프
function everyDayDuringTheMonthQuery() {
  return `SELECT TO_CHAR(TRUNC(time, 'DD'), 'YYYY-MM-DD') AS period, ROUND(AVG(bpm)) AS avg_bpm 
	  FROM bpmdata 
	  WHERE email = :Email AND time > (SELECT MAX(time) - INTERVAL '1' MONTH FROM bpmdata WHERE email = :Email) 
	  GROUP BY TO_CHAR(TRUNC(time, 'DD'), 'YYYY-MM-DD')
	  ORDER BY period`;
}

// 각 태그 별 1일 평균값, 최고값, 최저값 계산
function calculate_tag_statistics_per_day() {
  return `SELECT tag, MAX(bpm), MIN(bpm), ROUND(AVG(bpm)) FROM bpmdata WHERE time > (SELECT MAX(time) – INTERVAL ‘1’ DAY FROM bpmdata) AND email = :Email GROUP BY tag`;
}

// 각 태그 별 1주일 평균값, 최고값, 최저값 계산
function calculate_tag_statistics_per_week() {
  return `SELECT tag, MAX(bpm), MIN(bpm), ROUND(AVG(bpm)) FROM bpmdata WHERE time > (SELECT MAX(time) – INTERVAL ‘7’ DAY FROM bpmdata) AND email = :Email GROUP BY tag`;
}

// 각 태그 별 1달 평균값, 최고값, 최저값 계산
function calculate_tag_statistics_per_month() {
  return `SELECT tag, MAX(bpm), MIN(bpm), ROUND(AVG(bpm)) FROM bpmdata WHERE time > (SELECT MAX(time) – INTERVAL ‘1’ MONTH FROM bpmdata) AND email = :Email GROUP BY tag`;
}

// 각 태그 별 1주일 요일마다 평균값 그래프
function weekly_graph() {
  return `WITH all_days AS (
    	  	SELECT TO_CHAR(TRUNC(SYSDATE, 'D') + LEVEL - 1, 'Dy') AS day_of_week, TO_CHAR(TRUNC(SYSDATE, 'D') + LEVEL - 1, 'D') AS day_num
    	  	FROM DUAL
    	  	CONNECT BY LEVEL <= 7
	 ),
	 tag_days AS (
    		SELECT DISTINCT tag
    		FROM bpmdata
	 ),
	filtered_data AS (
    		SELECT *
    		FROM bpmdata
    		WHERE time > (SELECT MAX(time) - INTERVAL '7' DAY FROM bpmdata) AND email = :Email
	)
	SELECT td.tag, ad.day_of_week, NVL(round(AVG(fd.bpm)), 0) AS avg_bpm
	FROM all_days ad
	CROSS JOIN
    	tag_days td
	LEFT JOIN
    	filtered_data fd
    	ON td.tag = fd.tag
    	AND TO_CHAR(fd.time, 'Dy') = ad.day_of_week
	WHERE td.tag IS NOT NULL
	GROUP BY td.tag, ad.day_of_week, ad.day_num
	ORDER BY td.tag,ad.day_num`;
}

// 각 태그 별 1달 1일마다 평균값 그래프
function monthly_graph() {
  return `WITH all_days AS (
    		SELECT TO_CHAR(TRUNC(SYSDATE, 'D') + LEVEL - 1, 'Dy') AS day_of_week, TO_CHAR(TRUNC(SYSDATE, 'D') + LEVEL - 1, 'D') AS day_num
    		FROM DUAL
    		CONNECT BY LEVEL <= 7
	 ),
	 tag_days AS (
    		SELECT DISTINCT tag
    		FROM bpmdata
	 ),
	 filtered_data AS (
    		SELECT *
    		FROM bpmdata
    		WHERE time > (SELECT MAX(time) - INTERVAL '7' DAY FROM bpmdata) AND email = :Email
	 )
	SELECT td.tag, ad.day_of_week, NVL(round(AVG(fd.bpm)), 0) AS avg_bpm
	FROM all_days ad
	CROSS JOIN
    	tag_days td
	LEFT JOIN
    	filtered_data fd
    	ON td.tag = fd.tag
    	AND TO_CHAR(fd.time, 'Dy') = ad.day_of_week
	WHERE td.tag IS NOT NULL
	GROUP BY td.tag, ad.day_of_week, ad.day_num
	ORDER BY td.tag, ad.day_num`;
}

// 각 태그 별 심박수 수(도넛 차트)
function daily_donut_chart() {
    return `SELECT tag, COUNT(*) AS data_count  FROM bpmdata  WHERE email=:Email AND TO_CHAR(time, 'YYYY-MM-DD') = TO_CHAR(SYSDATE, 'YYYY-MM-DD') AND TO_CHAR(time, 'HH24:MI:SS') BETWEEN '00:00:00' AND '23:59:59'  GROUP BY tag  ORDER BY tag`;
}

// 실시간 태그
function realtimeTagQuery() {
  return `SELECT tag FROM bpmdata WHERE email = :Email ORDER BY time DESC FETCH FIRST 1 ROWS ONLY`;
}

function daily_bar_chart() {
    return `SELECT TO_CHAR(time, 'HH24') AS hour, tag, COUNT(*) AS data_count FROM bpmdata WHERE email = :Email AND time >= TRUNC(SYSDATE) AND time < TRUNC(SYSDATE) + 1 GROUP BY TO_CHAR(time, 'HH24'), tag ORDER BY hour, tag`;
}

module.exports = {
  connectToOracleDB,
  insertBPMData,
  selectUserlog,
  selectUserErrlog,
  fetchHeartRateData,
  realtimeQuery,
  minQuery,
  hourQuery,
  dayQuery,
  weekQuery,
  monthQuery,
  yearQuery,
  everyHourDuringTheDayQuery,
  everySevenHourDuringTheWeekQuery,
  everyDayDuringTheMonthQuery,
  calculate_tag_statistics_per_day,
  calculate_tag_statistics_per_week,
  calculate_tag_statistics_per_month,
  weekly_graph,
  monthly_graph,
  daily_donut_chart,
  realtimeTagQuery,
  daily_bar_chart,
  insertOTPSecret,
  getOTPSecret,
  deleteOTPSecret,
};
