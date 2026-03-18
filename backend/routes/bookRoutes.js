const express = require('express');
const router = express.Router();
const bookController = require('../controllers/booksController');

router.get('/books', bookController.getBooks);
router.post('/books', bookController.createBook);

router.get('/categories', bookController.getCategories);
router.post('/categories', bookController.createCategory);

router.get('/authors', bookController.getAuthors);
router.post('/authors', bookController.createAuthor);

module.exports = router;
