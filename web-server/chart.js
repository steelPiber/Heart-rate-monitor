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

router.get('/daily-tag-chart', async (req, res) => {
  try {
    const userEmail = await getUserEmailFromToken(req);
    const query = oracleDB.daily_donut_chart();
    const result = await executeQuery(query, { Email: userEmail });
    console.log('Query result:', result);

    // 기본값 설정
    const processedData = {
      active: 0,
      exercise: 0,
      rest: 0,
      normal: 0,
      sleep: 0
    };

    // 쿼리 결과가 있을 때만 처리
    if (result && result.rows && result.rows.length > 0) {
      result.rows.forEach(row => {
        const [tag, data_count] = row;
        processedData[tag.toLowerCase()] = data_count;
      });
    }

    // 클라이언트에게 JSON 형식으로 데이터 반환
    res.json(processedData);
  } catch (error) {
    console.error("Error executing query:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/bar-chart', async (req, res) => {
  try {
    console.log('reqToken: ', req.cookies.accessToken);
    const userEmail = await getUserEmailFromToken(req);
    console.log('userEmail:', userEmail);
    const query = oracleDB.daily_bar_chart();
    console.log('Executing query:', query);
    const result = await executeQuery(query, { Email: userEmail });
    console.log('Query result:', result);

    // 기본값 설정
    const processedData = [];

    // 쿼리 결과가 있을 때만 처리
    if (result && result.rows && result.rows.length > 0) {
      result.rows.forEach(row => {
        const [hour, tag, data_count] = row;
        processedData.push({ hour, tag, data_count });
      });
    } else {
      processedData.push({ hour: 0, tag: 'rest', data_count: 0 });
    }

    // 클라이언트에게 JSON 형식으로 데이터 반환
    res.json(processedData);
    
  } catch (error) {
    console.error("Error executing query:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
