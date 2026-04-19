const db = require('../db');
const emailService = require('./emailService');
async function checkAndNotifyOverdue() {
  const conn = await db.getConnection();
  try {
    // Find newly overdue records where notification hasn't been sent
    const getNewOverdueSql = `
      SELECT ir.issue_id,
             m.name AS member_name,
             m.email AS member_email,
             b.title AS book_title,
             ir.due_date
      FROM Issue_Record ir
      JOIN Member m ON ir.member_id = m.member_id
      JOIN Book_Copy bc ON ir.copy_id = bc.copy_id
      JOIN Book b ON bc.book_id = b.book_id
      WHERE ir.return_date IS NULL
        AND ir.due_date < SYSDATE
        AND NVL(ir.overdue_notified, 0) = 0
    `;
    const result = await conn.execute(getNewOverdueSql);
    const overdueRecords = result.rows;

    if (overdueRecords.length === 0) return;

    for (const record of overdueRecords) {
      const issueId = record.ISSUE_ID || record.issue_id;
      console.log(`[CHECKER] Sending urgent overdue notice for issue ${issueId}...`);

      const sent = await emailService.sendOverdueNotification(
        record.MEMBER_EMAIL || record.member_email,
        record.MEMBER_NAME || record.member_name,
        record.BOOK_TITLE || record.book_title
      );

      if (sent) {
        await conn.execute(
          `UPDATE Issue_Record SET overdue_notified = 1 WHERE issue_id = :id`,
          { id: issueId },
          { autoCommit: true }
        );
      }
    }
  } catch (err) {
    console.error('[CHECKER ERROR] Failed during overdue email sweep:', err.message);
  } finally {
    if (conn) await conn.close();
  }
}

/**
 * Starts the overdue monitoring background task.
 * @param {number} intervalMs - Frequency of checks
 */
function startOverdueMonitor(intervalMs = 30000) { // Default every 30 seconds
  console.log(`[SYS] Overdue Automated Email Monitor started. Tick: ${intervalMs}ms`);

  // Initial run after a short delay
  setTimeout(checkAndNotifyOverdue, 5000);

  // Repeating interval
  setInterval(checkAndNotifyOverdue, intervalMs);
}

module.exports = { startOverdueMonitor };
