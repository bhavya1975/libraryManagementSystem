const db = require('../db');
const emailService = require('../services/emailService');

// POST /api/issue  -> uses stored procedure issue_book(member_id, copy_id, librarian_id)
exports.issueBook = async (req, res) => {
  const { member_id, copy_id, librarian_id } = req.body;

  if (!member_id || !copy_id || !librarian_id) {
    return res
      .status(400)
      .json({ message: 'member_id, copy_id and librarian_id are required' });
  }

  try {
    const conn = await db.getConnection();
    try {
      await conn.execute(
        'BEGIN issue_book(:member_id, :copy_id, :librarian_id); END;',
        { member_id, copy_id, librarian_id },
        { autoCommit: true }
      );

      // --- SEND EMAIL (Background) ---
      // We do this in a separate try-block to not affect the main logic
      try {
        const detailsResult = await conn.execute(
          `SELECT 
              m.name AS member_name, 
              m.email AS member_email, 
              b.title AS book_title,
              (SELECT LISTAGG(a.name, ', ') WITHIN GROUP (ORDER BY a.name) 
               FROM Book_Author ba 
               JOIN Author a ON ba.author_id = a.author_id 
               WHERE ba.book_id = b.book_id) AS author_names,
              TO_CHAR(ir.issue_date, 'DD-Mon-YYYY') as issue_date,
              TO_CHAR(ir.due_date, 'DD-Mon-YYYY') as due_date,
              ir.issue_id,
              ir.issue_notified
          FROM Issue_Record ir
          JOIN Member m ON ir.member_id = m.member_id
          JOIN Book_Copy bc ON ir.copy_id = bc.copy_id
          JOIN Book b ON bc.book_id = b.book_id
          WHERE ir.member_id = :member_id 
            AND ir.copy_id = :copy_id 
            AND ir.return_date IS NULL
          ORDER BY ir.issue_id DESC
          FETCH FIRST 1 ROWS ONLY`,
          { member_id, copy_id }
        );

        if (detailsResult.rows.length > 0) {
          const row = detailsResult.rows[0];
          const issueId = row.ISSUE_ID || row.issue_id;
          
          if (Number(row.ISSUE_NOTIFIED || row.issue_notified || 0) === 0) {
            const sent = await emailService.sendTransactionEmail({
              toEmail: row.MEMBER_EMAIL || row.member_email,
              memberName: row.MEMBER_NAME || row.member_name,
              bookTitle: row.BOOK_TITLE || row.book_title,
              authorName: row.AUTHOR_NAMES || row.author_names,
              issueDate: row.ISSUE_DATE || row.issue_date,
              dueDate: row.DUE_DATE || row.due_date,
              type: 'issue'
            });

            if (sent) {
              await conn.execute(
                `UPDATE Issue_Record SET issue_notified = 1 WHERE issue_id = :id`,
                { id: issueId },
                { autoCommit: true }
              );
            }
          }
        }
      } catch (emailErr) {
        console.error("Error fetching details for email:", emailErr);
        // Don't fail the request if email fetch fails
      }

      res.status(201).json({ message: 'Book issued' });
    } finally {
      await conn.close();
    }
  } catch (err) {
    console.error(err);
    res
      .status(400)
      .json({ message: 'Error issuing book', error: err.message });
  }
};

// POST /api/return  -> uses stored procedure return_book(issue_id)
exports.returnBook = async (req, res) => {
  const { issue_id } = req.body;

  if (!issue_id) {
    return res.status(400).json({ message: 'issue_id is required' });
  }

  try {
    const conn = await db.getConnection();
    try {
      await conn.execute(
        'BEGIN return_book(:issue_id); END;',
        { issue_id },
        { autoCommit: true }
      );
      
      // Fetch the generated fine if there was one
      const fineResult = await conn.execute(
        'SELECT fine_id, amount FROM Fine WHERE issue_id = :issue_id',
        { issue_id }
      );
      
      let fineAmount = 0;
      let fineId = null;
      if (fineResult.rows.length > 0) {
        fineAmount = fineResult.rows[0].AMOUNT !== undefined ? fineResult.rows[0].AMOUNT : fineResult.rows[0].amount;
        fineId = fineResult.rows[0].FINE_ID !== undefined ? fineResult.rows[0].FINE_ID : fineResult.rows[0].fine_id;
      }

      // Fetch details for email
      try {
        const detailsResult = await conn.execute(
          `SELECT 
              m.name AS member_name, 
              m.email AS member_email, 
              b.title AS book_title,
              (SELECT LISTAGG(a.name, ', ') WITHIN GROUP (ORDER BY a.name) 
               FROM Book_Author ba 
               JOIN Author a ON ba.author_id = a.author_id 
               WHERE ba.book_id = b.book_id) AS author_names,
              TO_CHAR(ir.issue_date, 'DD-Mon-YYYY') as issue_date,
              TO_CHAR(ir.due_date, 'DD-Mon-YYYY') as due_date,
              ir.return_notified
          FROM Issue_Record ir
          JOIN Member m ON ir.member_id = m.member_id
          JOIN Book_Copy bc ON ir.copy_id = bc.copy_id
          JOIN Book b ON bc.book_id = b.book_id
          WHERE ir.issue_id = :issue_id`,
          { issue_id }
        );

        if (detailsResult.rows.length > 0) {
          const row = detailsResult.rows[0];
          
          if (Number(row.RETURN_NOTIFIED || row.return_notified || 0) === 0) {
            const sent = await emailService.sendTransactionEmail({
              toEmail: row.MEMBER_EMAIL || row.member_email,
              memberName: row.MEMBER_NAME || row.member_name,
              bookTitle: row.BOOK_TITLE || row.book_title,
              authorName: row.AUTHOR_NAMES || row.author_names,
              issueDate: row.ISSUE_DATE || row.issue_date,
              dueDate: row.DUE_DATE || row.due_date,
              type: 'return'
            });

            if (sent) {
              await conn.execute(
                `UPDATE Issue_Record SET return_notified = 1 WHERE issue_id = :id`,
                { id: issue_id },
                { autoCommit: true }
              );
            }
          }
        }
      } catch (emailErr) {
        console.error("Error fetching details for email:", emailErr);
      }

      res.json({ message: 'Book returned', fine: fineAmount, fine_id: fineId });
    } finally {
      await conn.close();
    }
  } catch (err) {
    console.error(err);
    res
      .status(400)
      .json({ message: 'Error returning book', error: err.message });
  }
};

// GET /api/overdue
exports.getOverdueBooks = async (_req, res) => {
  try {
    const conn = await db.getConnection();
    try {
      const sql = `
        SELECT ir.issue_id,
               m.member_id,
               m.name AS member_name,
               b.title,
               bc.copy_id,
               ir.issue_date,
               ir.due_date,
               FLOOR((SYSDATE - ir.due_date) * 24 * 60) AS minutes_overdue,
               CASE 
                 WHEN FLOOR((SYSDATE - ir.due_date) * 24 * 60) >= 1 THEN FLOOR((SYSDATE - ir.due_date) * 24 * 60) * ${process.env.FINE_RATE_RS || 50}
                 ELSE 0
               END AS fine_amount
        FROM Issue_Record ir
        JOIN Member m     ON ir.member_id = m.member_id
        JOIN Book_Copy bc ON ir.copy_id = bc.copy_id
        JOIN Book b       ON bc.book_id = b.book_id
        WHERE ir.return_date IS NULL
          AND ir.due_date < SYSDATE
      `;
      const result = await conn.execute(sql);
      res.json(result.rows);
    } finally {
      await conn.close();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching overdue books' });
  }
};

// GET /api/books/available?book_id=...
exports.getAvailableCopies = async (req, res) => {
  const { book_id } = req.query;

  if (!book_id) {
    return res.status(400).json({ message: 'book_id query parameter is required' });
  }

  try {
    const conn = await db.getConnection();
    try {
      const sql = `
        SELECT copy_id, shelf_location
        FROM Book_Copy
        WHERE book_id = :book_id
          AND status = 'available'
      `;
      const result = await conn.execute(sql, { book_id });
      res.json(result.rows);
    } finally {
      await conn.close();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching available copies' });
  }
};

// GET /api/fines?status=unpaid|paid (optional)
exports.getFines = async (req, res) => {
  const { status } = req.query;

  try {
    const conn = await db.getConnection();
    try {
      let sql = `
        SELECT f.fine_id,
               f.issue_id,
               f.amount,
               f.paid_status,
               ir.member_id,
               m.name AS member_name
        FROM Fine f
        JOIN Issue_Record ir ON f.issue_id = ir.issue_id
        JOIN Member m       ON ir.member_id = m.member_id
        WHERE 1 = 1
      `;
      const binds = {};

      if (status) {
        sql += ' AND f.paid_status = :status';
        binds.status = status;
      }

      const result = await conn.execute(sql, binds);
      res.json(result.rows);
    } finally {
      await conn.close();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching fines' });
  }
};

// POST /api/fines/:fine_id/pay  -> mark fine as paid
exports.markFinePaid = async (req, res) => {
  const { fine_id } = req.params;

  if (!fine_id) {
    return res.status(400).json({ message: 'fine_id is required' });
  }

  try {
    const conn = await db.getConnection();
    try {
      const result = await conn.execute(
        `
        UPDATE Fine
        SET paid_status = 'paid'
        WHERE fine_id = :fine_id
      `,
        { fine_id },
        { autoCommit: true }
      );

      if (result.rowsAffected === 0) {
        return res.status(404).json({ message: 'Fine not found' });
      }

      res.json({ message: 'Fine marked as paid' });
    } finally {
      await conn.close();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating fine status' });
  }
};

// GET /api/issues/current  -> currently issued (not yet returned)
exports.getCurrentIssues = async (_req, res) => {
  try {
    const conn = await db.getConnection();
    try {
      const sql = `
        WITH CopySeq AS (
          SELECT copy_id, book_id, ROW_NUMBER() OVER (PARTITION BY book_id ORDER BY copy_id) AS copy_number
          FROM Book_Copy
        )
        SELECT ir.issue_id,
               ir.copy_id,
               cs.copy_number,
               ir.member_id,
               m.name AS member_name,
               b.title,
               ir.issue_date,
               ir.due_date
        FROM Issue_Record ir
        JOIN Member m     ON ir.member_id = m.member_id
        JOIN CopySeq cs   ON ir.copy_id = cs.copy_id
        JOIN Book b       ON cs.book_id = b.book_id
        WHERE ir.return_date IS NULL
      `;
      const result = await conn.execute(sql);
      res.json(result.rows);
    } finally {
      await conn.close();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching current issues' });
  }
};

// GET /api/issues/history?member_id=... (optional)
exports.getIssueHistory = async (req, res) => {
  const { member_id } = req.query;

  try {
    const conn = await db.getConnection();
    try {
      let sql = `
        SELECT ir.issue_id,
               ir.copy_id,
               ir.member_id,
               m.name AS member_name,
               b.title,
               ir.issue_date,
               ir.due_date,
               ir.return_date
        FROM Issue_Record ir
        JOIN Member m     ON ir.member_id = m.member_id
        JOIN Book_Copy bc ON ir.copy_id = bc.copy_id
        JOIN Book b       ON bc.book_id = b.book_id
        WHERE 1 = 1
      `;
      const binds = {};

      if (member_id) {
        sql += ' AND ir.member_id = :member_id';
        binds.member_id = member_id;
      }

      sql += ' ORDER BY ir.issue_date DESC';

      const result = await conn.execute(sql, binds);
      res.json(result.rows);
    } finally {
      await conn.close();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching issue history' });
  }
};

// GET /api/stats -> dashboard summary (Personalized for users)
exports.getDashboardStats = async (req, res) => {
  const { role, member_id } = req.query;

  try {
    const conn = await db.getConnection();
    try {
      // 1. Core Counts (Conditional based on role)
      let statsQuery;
      let binds = {};

      if (role === 'user' && member_id) {
        statsQuery = `
          SELECT 
            (SELECT COUNT(*) FROM Issue_Record WHERE member_id = :member_id AND return_date IS NULL) AS user_borrowed,
            (SELECT COUNT(*) FROM Issue_Record WHERE member_id = :member_id AND return_date IS NULL AND due_date < SYSDATE) AS user_overdue,
            (SELECT COUNT(*) FROM Book_Copy) AS total_copies
          FROM DUAL
        `;
        binds = { member_id };
      } else {
        statsQuery = `
          SELECT 
            (SELECT COUNT(*) FROM Member WHERE status = 'active') AS users_count,
            (SELECT COUNT(*) FROM Book_Copy) AS total_copies,
            (SELECT COUNT(*) FROM Issue_Record WHERE return_date IS NULL) AS borrowed_count
          FROM DUAL
        `;
      }

      const mainStats = await conn.execute(statsQuery, binds);
      const statsRow = mainStats.rows[0];

      // 2. Most Borrowed Categories (Global for context)
      const categorySql = `
        SELECT c.category_name, COUNT(*) AS borrow_count
        FROM Issue_Record ir
        JOIN Book_Copy bc ON ir.copy_id = bc.copy_id
        JOIN Book b ON bc.book_id = b.book_id
        JOIN Category c ON b.category_id = c.category_id
        GROUP BY c.category_name
        ORDER BY borrow_count DESC
        FETCH FIRST 5 ROWS ONLY
      `;
      const categoryResult = await conn.execute(categorySql);

      // 3. Recent Activity (User specific or Global)
      let activitySql;
      let activityBinds = {};

      if (role === 'user' && member_id) {
        activitySql = `
          SELECT m.name AS member_name, b.title AS book_title, TO_CHAR(ir.issue_date, 'HH24:MI') AS activity_time, 'issue' AS type
          FROM Issue_Record ir
          JOIN Member m ON ir.member_id = m.member_id
          JOIN Book_Copy bc ON ir.copy_id = bc.copy_id
          JOIN Book b ON bc.book_id = b.book_id
          WHERE ir.member_id = :member_id
          ORDER BY ir.issue_date DESC
          FETCH FIRST 5 ROWS ONLY
        `;
        activityBinds = { member_id };
      } else {
        activitySql = `
          SELECT m.name AS member_name, b.title AS book_title, TO_CHAR(ir.issue_date, 'HH24:MI') AS activity_time, 'issue' AS type
          FROM Issue_Record ir
          JOIN Member m ON ir.member_id = m.member_id
          JOIN Book_Copy bc ON ir.copy_id = bc.copy_id
          JOIN Book b ON bc.book_id = b.book_id
          ORDER BY ir.issue_date DESC
          FETCH FIRST 5 ROWS ONLY
        `;
      }
      const activityResult = await conn.execute(activitySql, activityBinds);
      
      const payload = {
        totalBooks: Number(statsRow.TOTAL_COPIES || statsRow.total_copies || 0),
        categories: categoryResult.rows,
        activities: activityResult.rows
      };

      if (role === 'user') {
        payload.user_borrowed = Number(statsRow.USER_BORROWED || statsRow.user_borrowed || 0);
        payload.user_overdue = Number(statsRow.USER_OVERDUE || statsRow.user_overdue || 0);
      } else {
        payload.users = Number(statsRow.USERS_COUNT || statsRow.users_count || 0);
        payload.borrowed = Number(statsRow.BORROWED_COUNT || statsRow.borrowed_count || 0);
      }

      res.json(payload);
    } finally {
      await conn.close();
    }
  } catch (err) {
    console.error("Dashboard Stats Error:", err);
    res.status(500).json({ message: 'Error fetching stats' });
  }
};

