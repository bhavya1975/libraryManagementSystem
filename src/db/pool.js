const oracledb = require('oracledb');

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

let pool;

async function initPool() {
  if (!pool) {
    pool = await oracledb.createPool({
      user: process.env.DB_USER || 'library_user', // change to your Oracle user
      password: process.env.DB_PASSWORD || 'password', // change this
      connectString:
        process.env.DB_CONNECT ||
        'localhost/XEPDB1', // typical local XE/PDB connect string
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

