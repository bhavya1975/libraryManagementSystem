require('dotenv').config();
const db = require('./backend/db');
async function run() {
  const conn = await db.getConnection();
  const res = await conn.execute(`SELECT COUNT(*) as cnt FROM Book_Copy`);
  console.log("Book_Copy count:", res.rows[0]);

  const res2 = await conn.execute(`SELECT COUNT(*) as cnt FROM Book`);
  console.log("Book count:", res2.rows[0]);

  const statsQuery = `
          SELECT 
            (SELECT COUNT(*) FROM Member WHERE status = 'active') AS users_count,
            (SELECT COUNT(*) FROM Book_Copy) AS total_copies,
            (SELECT COUNT(*) FROM Issue_Record WHERE return_date IS NULL) AS borrowed_count
          FROM DUAL
        `;
  const res3 = await conn.execute(statsQuery);
  console.log("StatsQuery output:", res3.rows[0]);
  
  process.exit(0);
}
run().catch(console.error);
