const express = require('express');
const router = express.Router();
const oracleDB = require('./oracledb.js');
const { executeQuery } = require('./utility.js'); // 유틸리티 함수들 사용

// Hourly chart handler
router.get('/hourly-chart', async (req, res) => {
  try {
    // 세션이 있는지 확인
    if (!req.session || !req.session.user || !req.session.user.email) {
      return res.json({ session: 'none' });
    }

    const userEmail = req.session.user.email;
    const query = oracleDB.everyHourDuringTheDayQuery();
    const result = await executeQuery(query, { Email: userEmail });

    if (result.rows.length === 0) {
      return res.json({ none: 'none' });
    }

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
    const userEmail = req.session.user.email;
    const query = oracleDB.everySevenHourDuringTheWeekQuery();
    const result = await executeQuery(query, { Email: userEmail });

    if (result.rows.length === 0) {
      return res.json({ none: 'none' });
    }

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
    const userEmail = req.session.user.email;
    const query = oracleDB.everyDayDuringTheMonthQuery();
    const result = await executeQuery(query, { Email: userEmail });

    if (result.rows.length === 0) {
      return res.json({ none: 'none' });
    }

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

// Daily tag chart handler
router.get('/daily-tag-chart', async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    const query = oracleDB.daily_donut_chart();
    const result = await executeQuery(query, { Email: userEmail });

    if (result.rows.length === 0) {
      return res.json({ none: 'none' });
    }

    // 기본값 설정
    const processedData = {
      active: 0,
      exercise: 0,
      rest: 0,
      sleep: 0
    };

    // 쿼리 결과가 있을 때만 처리
    result.rows.forEach(row => {
      const [tag, data_count] = row;
      processedData[tag.toLowerCase()] = data_count;
    });

    // 클라이언트에게 JSON 형식으로 데이터 반환
    res.json(processedData);
  } catch (error) {
    console.error("Error executing query:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Bar chart handler
router.get('/bar-chart', async (req, res) => {
  try {
    const userEmail = req.session.user.email;
    const query = oracleDB.daily_bar_chart();
    const result = await executeQuery(query, { Email: userEmail });

    if (result.rows.length === 0) {
      return res.json({ none: 'none' });
    }

    const processedData = result.rows.map(row => {
      const [hour, tag, data_count] = row;
      return { hour, tag, data_count };
    });

    res.json(processedData);
  } catch (error) {
    console.error("Error executing query:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
