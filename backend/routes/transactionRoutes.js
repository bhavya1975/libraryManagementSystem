const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionsController');

router.post('/issue', transactionController.issueBook);
router.post('/return', transactionController.returnBook);
router.get('/overdue', transactionController.getOverdueBooks);
router.get('/books/available', transactionController.getAvailableCopies);

// Fine-related endpoints
router.get('/fines', transactionController.getFines);
router.post('/fines/:fine_id/pay', transactionController.markFinePaid);

// Issue/return history
router.get('/issues/current', transactionController.getCurrentIssues);
router.get('/issues/history', transactionController.getIssueHistory);

module.exports = router;

