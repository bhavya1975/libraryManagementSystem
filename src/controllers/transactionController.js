const db = require('../db/pool');

// POST /api/issue  -> uses stored procedure issue_book(member_id, copy_id, librarian_id)
exports.issueBook = async (req, res) => {
  const { member_id, copy_id, librarian_id } = req.body;

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

  try {
    const conn = await db.getConnection();
    try {
      await conn.execute(
        'BEGIN return_book(:issue_id); END;',
        { issue_id },
        { autoCommit: true }
      );
      res.json({ message: 'Book returned' });
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
               TRUNC(SYSDATE - ir.due_date) AS days_overdue
        FROM Issue_Record ir
        JOIN Member m     ON ir.member_id = m.member_id
        JOIN Book_Copy bc ON ir.copy_id = bc.copy_id
        JOIN Book b       ON bc.book_id = b.book_id
        WHERE ir.return_date IS NULL
          AND ir.due_date < TRUNC(SYSDATE)
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

