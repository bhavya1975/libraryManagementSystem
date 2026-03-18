const express = require('express');
const router = express.Router();
const memberController = require('../controllers/membersController');

router.get('/members', memberController.getMembers);
router.post('/members', memberController.createMember);

router.get('/librarians', memberController.getLibrarians);

module.exports = router;

