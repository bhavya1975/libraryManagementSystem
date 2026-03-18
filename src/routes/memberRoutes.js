const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');

router.get('/members', memberController.getMembers);
router.post('/members', memberController.createMember);

module.exports = router;

