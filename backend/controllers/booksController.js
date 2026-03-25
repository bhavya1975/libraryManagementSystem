const db = require('../db');

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
    author_ids = [],
    number_of_copies = 1
  } = req.body;

  if (!title || !isbn || !category_id) {
    return res
      .status(400)
      .json({ message: 'title, isbn and category_id are required' });
  }

  const conn = await db.getConnection();
  try {
    const oracledb = require('oracledb');

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
        book_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
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

    if (number_of_copies > 0) {
      const insertCopySql = "INSERT INTO Book_Copy (book_id, status) VALUES (:book_id, 'available')";
      for (let i = 0; i < number_of_copies; i++) {
        await conn.execute(
          insertCopySql,
          { book_id: bookId },
          { autoCommit: false }
        );
      }
    }

    await conn.commit();
    res.status(201).json({ message: 'Book created', book_id: bookId });
  } catch (err) {
    try {
      await conn.rollback();
    } catch (_) {
      // ignore rollback error
    }
    console.error(err);
    res.status(500).json({ message: 'Error creating book' });
  } finally {
    await conn.close();
  }
};

// GET /api/categories
exports.getCategories = async (_req, res) => {
  try {
    const conn = await db.getConnection();
    try {
      const result = await conn.execute(
        'SELECT category_id, category_name FROM Category ORDER BY category_name'
      );
      res.json(result.rows);
    } finally {
      await conn.close();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching categories' });
  }
};

// POST /api/categories
exports.createCategory = async (req, res) => {
  const { category_name } = req.body;
  if (!category_name) {
    return res.status(400).json({ message: 'category_name is required' });
  }
  try {
    const conn = await db.getConnection();
    try {
      const oracledb = require('oracledb');
      const result = await conn.execute(
        `INSERT INTO Category (category_name) VALUES (:category_name) RETURNING category_id INTO :category_id`,
        { category_name, category_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER } },
        { autoCommit: true }
      );
      res.status(201).json({ message: 'Category created', category_id: result.outBinds.category_id[0] });
    } finally {
      await conn.close();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating category', error: err.message });
  }
};

// GET /api/authors
exports.getAuthors = async (_req, res) => {
  try {
    const conn = await db.getConnection();
    try {
      const result = await conn.execute(
        'SELECT author_id, name, nationality FROM Author ORDER BY name'
      );
      res.json(result.rows);
    } finally {
      await conn.close();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching authors' });
  }
};

// POST /api/authors
exports.createAuthor = async (req, res) => {
  const { name, nationality } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'name is required' });
  }
  try {
    const conn = await db.getConnection();
    try {
      const oracledb = require('oracledb');
      const result = await conn.execute(
        `INSERT INTO Author (name, nationality) VALUES (:name, :nationality) RETURNING author_id INTO :author_id`,
        { name, nationality, author_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER } },
        { autoCommit: true }
      );
      res.status(201).json({ message: 'Author created', author_id: result.outBinds.author_id[0] });
    } finally {
      await conn.close();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating author', error: err.message });
  }
};

// POST /api/books/:id/copies
exports.addCopies = async (req, res) => {
  const bookId = parseInt(req.params.id);
  const { number_of_copies = 1 } = req.body;
  if (!bookId || number_of_copies < 1) return res.status(400).json({ message: 'Invalid data' });
  
  try {
    const conn = await db.getConnection();
    try {
      const insertCopySql = "INSERT INTO Book_Copy (book_id, status) VALUES (:book_id, 'available')";
      for (let i = 0; i < number_of_copies; i++) {
        await conn.execute(insertCopySql, { book_id: bookId }, { autoCommit: false });
      }
      await conn.commit();
      res.status(201).json({ message: 'Copies added successfully' });
    } catch (err) {
      await conn.rollback();
      console.error(err);
      res.status(500).json({ message: 'Error adding copies' });
    } finally {
      await conn.close();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Database error' });
  }
};

// DELETE /api/books/:id
exports.deleteBook = async (req, res) => {
  const bookId = parseInt(req.params.id);
  if (!bookId) return res.status(400).json({ message: 'book_id required' });
  try {
    const conn = await db.getConnection();
    try {
      await conn.execute('DELETE FROM Book_Copy WHERE book_id = :book_id', { book_id: bookId }, { autoCommit: false });
      await conn.execute('DELETE FROM Book_Author WHERE book_id = :book_id', { book_id: bookId }, { autoCommit: false });
      await conn.execute('DELETE FROM Book WHERE book_id = :book_id', { book_id: bookId }, { autoCommit: false });
      await conn.commit();
      res.json({ message: 'Book deleted successfully' });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      await conn.close();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting book', error: err.message });
  }
};

// PUT /api/books/:id
exports.updateBook = async (req, res) => {
  const bookId = parseInt(req.params.id);
  const { title, isbn, publisher, publication_year } = req.body;
  
  if (!bookId || !title || !isbn) return res.status(400).json({ message: 'book_id, title, isbn required' });
  
  try {
    const conn = await db.getConnection();
    try {
      await conn.execute(
        `UPDATE Book SET title = :title, isbn = :isbn, publisher = :publisher, publication_year = :publication_year WHERE book_id = :book_id`,
        { title, isbn, publisher, publication_year, book_id: bookId },
        { autoCommit: true }
      );
      res.json({ message: 'Book updated successfully' });
    } finally {
      await conn.close();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating book', error: err.message });
  }
};
