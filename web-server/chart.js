const express = require('express');
const router = express.Router();
const oracleDB = require('./oracledb.js');
const { getUserEmailFromToken, executeQuery } = require('./utility.js'); // 유틸리티 함수들 사용

// Hourly chart handler
router.get('/hourly-chart', async (req, res) => {
  try {
    const userEmail = await getUserEmailFromToken(req);
    const query = oracleDB.everyHourDuringTheDayQuery();
    const result = await executeQuery(query, { Email: userEmail });

    const data = result.rows.map(row => {
      const date = row[0].slice(5, 16); // "2024-" 부분을 제거하고 월 일만 추출
      const [month, day, hour] = date.split(' ');
      const formattedDate = `${month} ${day}`;
      return [formattedDate, row[1]];
    });
    
    const responseData = {
      userEmail: userEmail,
      data: data
    };
    
    res.json(responseData);
  } catch (err) {
    res.status(500).send('Error retrieving data');
  }
});

// Weekly chart handler
router.get('/weekly-chart', async (req, res) => {
  try {
    const userEmail = await getUserEmailFromToken(req);
    const query = oracleDB.everySevenHourDuringTheWeekQuery();
    const result = await executeQuery(query, { Email: userEmail });
    const data = result.rows.map(row => {
      const date = row[0].slice(5, 16); // "2024-" 부분을 제거하고 월 일만 추출
      const [month, day, hour] = date.split(' ');
      const formattedDate = `${month} ${day}`;
      return [formattedDate, row[1]];
    });

    const responseData = {
      userEmail: userEmail,
      data: data
    };
    
    res.json(responseData);
  } catch (err) {
    res.status(500).send('Error retrieving data');
  }
});


// Monthly chart handler
router.get('/monthly-chart', async (req, res) => {
  try {
    const userEmail = await getUserEmailFromToken(req);
    const query = oracleDB.everyDayDuringTheMonthQuery();
    const result = await executeQuery(query, { Email: userEmail });
    const data = result.rows.map(row => [row[0], row[1]]);
    const responseData = {
      userEmail: userEmail,
      data: data
    };
    
    res.json(responseData);
  } catch (err) {
    res.status(500).send('Error retrieving data');
  }
});

router.get('/donut', async (req, res) => {
  try {
    console.log('reqToken: ', req.cookies.accessToken);
    const userEmail = await getUserEmailFromToken(req);
    const query = oracleDB.daily_donut_chart();
    const result = await executeQuery(query, { Email: userEmail });

    if (!result) {
      // 쿼리 결과가 없는 경우, 빈 배열을 반환하도록 처리
      res.json([]);
    } else {

    // normal과 sleep이 쿼리 결과에 없는 경우 0으로 설정
    const processedData = result.rows.map(row => ({
      active: row.active || 0,
      exercise: row.exercise || 0,
      rest: row.rest || 0,
      normal: row.normal || 0,
      sleep: row.sleep || 0
    }));

    // 클라이언트에게 JSON 형식으로 데이터 반환
    res.json(processedData);
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
