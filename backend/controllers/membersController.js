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

