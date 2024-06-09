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

module.exports = router;
