const express = require('express');
const router = express.Router();
const multer = require('multer');
const tenantTrustAuthController = require('../controllers/tenantTrustAuthController');
const authMiddleware = require('../middlewares/authMiddleware'); // Ensure authentication


const upload = multer();

// POST: Send OTP
router.post('/send-otp', upload.none(), tenantTrustAuthController.sendOtp);
// router.post('/verify/phone', upload.none(), tenantTrustAuthController.verifyPhone);
router.post('/verify/otp', upload.none(), tenantTrustAuthController.verifyOtp);
router.post('/logout', authMiddleware,  tenantTrustAuthController.logout);



module.exports = router;