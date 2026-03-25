const db = require('./db');
const fs = require('fs');
const path = require('path');

async function deployProcs() {
  const sqlFile = fs.readFileSync(path.join(__dirname, '..', 'sql', 'triggers.sql'), 'utf-8');
  const commands = sqlFile.split(/(\r?\n)\/(\r?\n)/).filter(c => c.trim() && c.trim() !== '/' && c !== 'COMMIT;');
  
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
