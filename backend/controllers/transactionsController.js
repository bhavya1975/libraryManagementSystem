const db = require('../db');

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
        'SELECT amount FROM Fine WHERE issue_id = :issue_id',
        { issue_id }
      );
      
      let fineAmount = 0;
      if (fineResult.rows.length > 0) {
        // Handle potential exact uppercase depending on connection setup if lowerCaseKeys hasn't kicked in
        fineAmount = fineResult.rows[0].AMOUNT !== undefined ? fineResult.rows[0].AMOUNT : fineResult.rows[0].amount;
      }

      res.json({ message: 'Book returned', fine: fineAmount });
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
               ROUND((SYSDATE - ir.due_date) * 24 * 60) AS minutes_overdue
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

