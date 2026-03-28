const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');

router.post('/issue', transactionController.issueBook);
router.post('/return', transactionController.returnBook);
router.get('/overdue', transactionController.getOverdueBooks);
router.get('/books/available', transactionController.getAvailableCopies);

module.exports = router;

