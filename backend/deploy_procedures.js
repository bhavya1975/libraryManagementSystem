require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('./db');
const fs = require('fs');
const path = require('path');

async function deployProcs() {
  let sqlFile = fs.readFileSync(path.join(__dirname, '..', 'sql', 'procedures.sql'), 'utf-8');
  
  // Inject environment variables into SQL templates
  sqlFile = sqlFile.replace(/{{__FINE_RATE__}}/g, process.env.FINE_RATE_RS || 50);
  sqlFile = sqlFile.replace(/{{__LOAN_PERIOD__}}/g, process.env.LOAN_PERIOD_MINUTES || 1);
  
  const conn = await db.getConnection();
  try {
    let currentBlock = [];
    for (let c of sqlFile.split(/\r?\n/)) {
      if (c === '/') {
        let cmd = currentBlock.join('\n').trim();
        if (cmd && !cmd.startsWith('-- Oracle PL/SQL')) {
          try {
            await conn.execute(cmd);
            console.log('Successfully executed block.');
          } catch(e) { console.error('Error on block:', e.message); }
        }
        currentBlock = [];
      } else {
        currentBlock.push(c);
      }
    }
  } catch(err) {
    console.error(err);
  } finally {
    await conn.close();
  }
}
deployProcs();
