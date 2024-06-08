const oracleDB = require('./oracledb.js');
const { getUserInfo } = require("./google_authController.js");

async function executeQuery(query, params) {
  const connection = await oracleDB.connectToOracleDB();
  try {
    const result = await connection.execute(query, params);
    await connection.close();
    return result;
  } catch (err) {
    console.error('Error executing query:', err);
    await connection.close();
    throw err;
  }
}

async function getUserEmailFromToken(req) {
  const accessToken = req.cookies.accessToken;
  if (!accessToken) {
    throw new Error('Access token is missing');
  }
  const userInfo = await getUserInfo(accessToken);
  return userInfo.email.split('@')[0];
}

module.exports = {
  executeQuery,
  getUserEmailFromToken,
};
