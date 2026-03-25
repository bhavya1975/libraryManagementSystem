const db = require('../db');

// GET /api/members
exports.getMembers = async (_req, res) => {
  try {
    const conn = await db.getConnection();
    try {
      const result = await conn.execute(
        'SELECT member_id, name, email, phone, membership_date, status FROM Member'
      );
      res.json(result.rows);
    } finally {
      await conn.close();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching members' });
  }
};

// POST /api/members
exports.createMember = async (req, res) => {
  const { name, email, phone, status = 'active' } = req.body;

  if (!name || !email) {
    return res.status(400).json({ message: 'name and email are required' });
  }

  try {
    const conn = await db.getConnection();
    try {
      const oracledb = require('oracledb');
      const sql = `
        INSERT INTO Member (name, email, phone, membership_date, status)
        VALUES (:name, :email, :phone, TRUNC(SYSDATE), :status)
        RETURNING member_id INTO :member_id
      `;
      const result = await conn.execute(
        sql,
        {
          name,
          email,
          phone,
          status,
          member_id: {
            dir: oracledb.BIND_OUT,
            type: oracledb.NUMBER
          }
        },
        { autoCommit: true }
      );

      res.status(201).json({
        message: 'Member created',
        member_id: result.outBinds.member_id[0]
      });
    } finally {
      await conn.close();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating member', error: err.message });
  }
};

// GET /api/librarians
exports.getLibrarians = async (_req, res) => {
  try {
    const conn = await db.getConnection();
    try {
      const result = await conn.execute(
        'SELECT librarian_id, name, email FROM Librarian'
      );
      res.json(result.rows);
    } finally {
      await conn.close();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching librarians' });
  }
};

// POST /api/librarians
exports.createLibrarian = async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) return res.status(400).json({ message: 'name and email required' });
  try {
    const conn = await db.getConnection();
    const oracledb = require('oracledb');
    try {
      const sql = `INSERT INTO Librarian (name, email) VALUES (:name, :email) RETURNING librarian_id INTO :librarian_id`;
      const result = await conn.execute(sql, { name, email, librarian_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER } }, { autoCommit: true });
      res.status(201).json({ message: 'Librarian created', librarian_id: result.outBinds.librarian_id[0] });
    } finally {
      await conn.close();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating librarian' });
  }
};

// GET /api/members/:id/issued
exports.getMemberIssuedBooks = async (req, res) => {
  const member_id = parseInt(req.params.id);
  if (!member_id) return res.status(400).json({ message: 'member_id required' });
  try {
    const conn = await db.getConnection();
    try {
      const sql = `
        SELECT i.issue_id, b.title, c.copy_id, i.issue_date, i.due_date, i.return_date, 
               NVL(f.amount, 0) AS fine_amount, f.paid_status
        FROM Issue_Record i
        JOIN Book_Copy c ON i.copy_id = c.copy_id
        JOIN Book b ON c.book_id = b.book_id
        LEFT JOIN Fine f ON i.issue_id = f.issue_id
        WHERE i.member_id = :member_id
        ORDER BY i.return_date NULLS FIRST, i.issue_date DESC
      `;
      const result = await conn.execute(sql, { member_id });
      res.json(result.rows);
    } finally {
      await conn.close();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching issued books' });
  }
};

