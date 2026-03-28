const express = require('express');
const router = express.Router();
const bookController = require('../controllers/booksController');

router.get('/books', bookController.getBooks);
router.post('/books', bookController.createBook);
router.post('/books/:id/copies', bookController.addCopies);
router.put('/books/:id', bookController.updateBook);
router.delete('/books/:id', bookController.deleteBook);

router.get('/categories', bookController.getCategories);
router.post('/categories', bookController.createCategory);

router.get('/authors', bookController.getAuthors);
router.post('/authors', bookController.createAuthor);

module.exports = router;
