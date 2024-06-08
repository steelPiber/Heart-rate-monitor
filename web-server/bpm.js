const express = require("express");
const router = express.Router();
const oracleDB = require('./oracledb.js');
const { executeQuery, getUserEmailFromToken } = require('./server.js'); // Ensure these are exported

router.use(express.urlencoded({ extended: true }));
router.use(express.json());

router.post("/data", async (req, res) => {
  console.log("Received request body:", req.body);
  const { bpm, tag, email } = req.body;
  const EmailWithoutDomain = email.split('@')[0];

  try {
    await oracleDB.insertBPMData(bpm, EmailWithoutDomain, tag);
    console.log('Successfully inserted BPM data into Oracle DB');
    res.sendStatus(200);
  } catch (error) {
    console.error('Error inserting BPM data into Oracle DB:', error);
    res.sendStatus(500);
  }
});

const createQueryHandler = (queryFunction) => async (req, res) => {
  try {
    const userEmail = await getUserEmailFromToken(req);
    const query = queryFunction();
    const result = await executeQuery(query, { Email: userEmail });
    const data = result.rows.map(row => row[0]);
    res.json(data);
  } catch (err) {
    res.status(500).send('Error retrieving data');
  }
};

router.get('/realtime-bpm', createQueryHandler(oracleDB.realtimeQuery));
router.get('/average-bpm', createQueryHandler(oracleDB.minQuery));
router.get('/hour-bpm', createQueryHandler(oracleDB.hourQuery));
router.get('/day-bpm', createQueryHandler(oracleDB.dayQuery));
router.get('/week-bpm', createQueryHandler(oracleDB.weekQuery));
router.get('/month-bpm', createQueryHandler(oracleDB.monthQuery));
router.get('/year-bpm', createQueryHandler(oracleDB.yearQuery));

module.exports = router;
