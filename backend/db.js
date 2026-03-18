const oracledb = require('oracledb');

// Central Oracle connection pool used by backend controllers.
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

let pool;

async function initPool() {
  if (!pool) {
    pool = await oracledb.createPool({
      user: process.env.DB_USER || 'dbmsproj',
      password: process.env.DB_PASSWORD || 'password',
      connectString:
        process.env.DB_CONNECT ||
        'localhost:1521/xepdb1',
      poolMin: 1,
      poolMax: 10,
      poolIncrement: 1
    });
  }
  return pool;
}

async function getConnection() {
  const p = await initPool();
  return p.getConnection();
}

module.exports = {
  getConnection
};

