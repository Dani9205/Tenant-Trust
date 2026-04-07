const express = require('express');
const router = express.Router();
const blockController = require('../controllers/blockController');

// GET all blocked users by myId
router.get('/blocks/:myId', blockController.getBlockedUsers);

// POST toggle block/unblock
router.post('/blocks/toggle', blockController.toggleBlock);

module.exports = router;
