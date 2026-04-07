const express = require('express');
const router = express.Router();
const guaranteeLetterController = require('../controllers/guaranteeLetterController');
const authMiddleware = require('../middlewares/authMiddleware'); // Ensure authentication


// Get all guarantee letters
router.get('/guarantee-letter/:userId',authMiddleware, guaranteeLetterController.getGuaranteeLetterByUser);

router.put('/guarantee-letter/:userId',authMiddleware, guaranteeLetterController.updateGuaranteeLetterByUser);



module.exports = router;