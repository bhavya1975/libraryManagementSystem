const express = require('express');
const router = express.Router();
const memberController = require('../controllers/membersController');

router.get('/members', memberController.getMembers);
router.post('/members', memberController.createMember);
router.get('/members/:id/issued', memberController.getMemberIssuedBooks);

router.get('/librarians', memberController.getLibrarians);
router.post('/librarians', memberController.createLibrarian);

module.exports = router;

