-- Basic seed data for Oracle
SET DEFINE OFF;
INSERT INTO Category (category_name) VALUES ('Fiction');
INSERT INTO Category (category_name) VALUES ('Non-fiction');
INSERT INTO Category (category_name) VALUES ('Science');
INSERT INTO Category (category_name) VALUES ('Technology');

INSERT INTO Author (name, nationality) VALUES ('J. K. Rowling', 'British');
INSERT INTO Author (name, nationality) VALUES ('George Orwell', 'British');
INSERT INTO Author (name, nationality) VALUES ('Dennis Ritchie', 'American');

INSERT INTO Book (title, isbn, publisher, publication_year, category_id)
VALUES (
  'Harry Potter and the Philosopher''s Stone',
  '9780747532699',
  'Bloomsbury',
  1997,
  (SELECT category_id FROM Category WHERE category_name = 'Fiction' FETCH FIRST 1 ROWS ONLY)
);

INSERT INTO Book (title, isbn, publisher, publication_year, category_id)
VALUES (
  '1984',
  '9780451524935',
  'Secker & Warburg',
  1949,
  (SELECT category_id FROM Category WHERE category_name = 'Fiction' FETCH FIRST 1 ROWS ONLY)
);

INSERT INTO Book (title, isbn, publisher, publication_year, category_id)
VALUES (
  'The C Programming Language',
  '9780131103627',
  'Prentice Hall',
  1988,
  (SELECT category_id FROM Category WHERE category_name = 'Technology')
);

-- Connect books and authors
INSERT INTO Book_Author (book_id, author_id)
SELECT b.book_id, a.author_id
FROM   Book b
JOIN   Author a
ON (
     (b.title = 'Harry Potter and the Philosopher''s Stone' AND a.name = 'J. K. Rowling')
  OR (b.title = '1984' AND a.name = 'George Orwell')
  OR (b.title = 'The C Programming Language' AND a.name = 'Dennis Ritchie')
);

-- Copies (2 copies per book)
INSERT INTO Book_Copy (book_id, status, shelf_location)
SELECT book_id, 'available', 'A-1'
FROM   Book
WHERE  title = 'Harry Potter and the Philosopher''s Stone';

INSERT INTO Book_Copy (book_id, status, shelf_location)
SELECT book_id, 'available', 'A-2'
FROM   Book
WHERE  title = 'Harry Potter and the Philosopher''s Stone';

INSERT INTO Book_Copy (book_id, status, shelf_location)
SELECT book_id, 'available', 'B-1'
FROM   Book
WHERE  title = '1984';

INSERT INTO Book_Copy (book_id, status, shelf_location)
SELECT book_id, 'available', 'B-2'
FROM   Book
WHERE  title = '1984';

INSERT INTO Book_Copy (book_id, status, shelf_location)
SELECT book_id, 'available', 'C-1'
FROM   Book
WHERE  title = 'The C Programming Language';

INSERT INTO Book_Copy (book_id, status, shelf_location)
SELECT book_id, 'available', 'C-2'
FROM   Book
WHERE  title = 'The C Programming Language';

-- Members
INSERT INTO Member (name, email, phone, membership_date, status)
VALUES ('Alice', 'alice@example.com', '1111111111', TRUNC(SYSDATE), 'active');

INSERT INTO Member (name, email, phone, membership_date, status)
VALUES ('Bob', 'bob@example.com', '2222222222', TRUNC(SYSDATE), 'active');

-- Librarians
INSERT INTO Librarian (name, email)
VALUES ('Admin Librarian', 'admin@library.com');

COMMIT;