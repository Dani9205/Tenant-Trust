const express = require('express');
const router = express.Router();
const guaranteeLetterController = require('../controllers/guaranteeLetterController');
const authMiddleware = require('../middlewares/authMiddleware'); // Ensure authentication


// Get all guarantee letters
router.get('/guarantee-letter/:id', authMiddleware,guaranteeLetterController.getGuaranteeLetterById);

// Update a guarantee letter
router.put('/guarantee-letters/:id',authMiddleware, guaranteeLetterController.updateGuaranteeLetter);

module.exports = router;
