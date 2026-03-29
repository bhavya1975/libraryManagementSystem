require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('./db');
const fs = require('fs');
const path = require('path');

async function executeBlocks(sqlFile, conn, fileLabel) {
  let currentBlock = [];
  for (let c of sqlFile.split(/\r?\n/)) {
    if (c === '/') {
      let cmd = currentBlock.join('\n').trim();
      if (cmd && !cmd.startsWith('-- Oracle PL/SQL') && !cmd.startsWith('-- Oracle triggers')) {
        try {
          await conn.execute(cmd);
          console.log(`[${fileLabel}] Successfully executed block.`);
        } catch(e) { console.error(`[${fileLabel}] Error on block:`, e.message); }
      }
      currentBlock = [];
    } else {
      currentBlock.push(c);
    }
  }
}

async function deployProcsAndTriggers() {
  const conn = await db.getConnection();
  try {
    // 1. Deploy Procedures
    let procSql = fs.readFileSync(path.join(__dirname, '..', 'sql', 'procedures.sql'), 'utf-8');
    procSql = procSql.replace(/{{__FINE_RATE__}}/g, process.env.FINE_RATE_RS || 50);
    procSql = procSql.replace(/{{__LOAN_PERIOD__}}/g, process.env.LOAN_PERIOD_MINUTES || 1);
    await executeBlocks(procSql, conn, 'Procedures');

    // 2. Deploy Triggers
    let trigSql = fs.readFileSync(path.join(__dirname, '..', 'sql', 'triggers.sql'), 'utf-8');
    trigSql = trigSql.replace(/{{__FINE_RATE__}}/g, process.env.FINE_RATE_RS || 50);
    trigSql = trigSql.replace(/{{__LOAN_PERIOD__}}/g, process.env.LOAN_PERIOD_MINUTES || 1);
    await executeBlocks(trigSql, conn, 'Triggers');

  } catch(err) {
    console.error(err);
  } finally {
    await conn.close();
  }
}

deployProcsAndTriggers();
