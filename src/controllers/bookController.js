const db = require('../db/pool');

// GET /api/books?title=&author=&category=
exports.getBooks = async (req, res) => {
  const { title, author, category } = req.query;
  try {
    let sql = `
      SELECT b.book_id,
             b.title,
             b.isbn,
             b.publisher,
             b.publication_year,
             c.category_name,
             LISTAGG(a.name, ', ') WITHIN GROUP (ORDER BY a.name) AS authors
      FROM Book b
      LEFT JOIN Category c ON b.category_id = c.category_id
      LEFT JOIN Book_Author ba ON b.book_id = ba.book_id
      LEFT JOIN Author a ON ba.author_id = a.author_id
      WHERE 1 = 1
    `;
    const binds = {};

    if (title) {
      sql += ' AND LOWER(b.title) LIKE :title';
      binds.title = `%${title.toLowerCase()}%`;
    }
    if (author) {
      sql += ' AND LOWER(a.name) LIKE :author';
      binds.author = `%${author.toLowerCase()}%`;
    }
    if (category) {
      sql += ' AND LOWER(c.category_name) LIKE :category';
      binds.category = `%${category.toLowerCase()}%`;
    }

    sql += ' GROUP BY b.book_id, b.title, b.isbn, b.publisher, b.publication_year, c.category_name';

    const conn = await db.getConnection();
    try {
      const result = await conn.execute(sql, binds);
      res.json(result.rows);
    } finally {
      await conn.close();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching books' });
  }
};

// POST /api/books
exports.createBook = async (req, res) => {
  const {
    title,
    isbn,
    publisher,
    publication_year,
    category_id,
    author_ids = []
  } = req.body;

  const conn = await db.getConnection();
  try {
    await conn.execute('BEGIN NULL; END;'); // ensure connection is open

    const insertBookSql = `
      INSERT INTO Book (title, isbn, publisher, publication_year, category_id)
      VALUES (:title, :isbn, :publisher, :publication_year, :category_id)
      RETURNING book_id INTO :book_id
    `;

    const result = await conn.execute(
      insertBookSql,
      {
        title,
        isbn,
        publisher,
        publication_year,
        category_id,
        book_id: { dir: require('oracledb').BIND_OUT, type: require('oracledb').NUMBER }
      },
      { autoCommit: false }
    );

    const bookId = result.outBinds.book_id[0];

    if (author_ids.length > 0) {
      const insertAuthorSql =
        'INSERT INTO Book_Author (book_id, author_id) VALUES (:book_id, :author_id)';
      for (const authorId of author_ids) {
        await conn.execute(
          insertAuthorSql,
          { book_id: bookId, author_id: authorId },
          { autoCommit: false }
        );
      }
    }

    await conn.commit();
    res.status(201).json({ message: 'Book created', book_id: bookId });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Error creating book' });
  } finally {
    await conn.close();
  }
};

