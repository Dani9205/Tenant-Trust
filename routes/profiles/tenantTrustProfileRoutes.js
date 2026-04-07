const express = require('express');
const router = express.Router();
const tenantTrustProfileController = require('../../controllers/profiles/tenantTrustProfileController');
const multer = require('multer');
const upload = require('../../middlewares/upload'); // adjust path
const authMiddleware = require('../../middlewares/authMiddleware'); // Ensure authentication

// Complete Profile (First-Time Setup)
router.post('/complete-profile', authMiddleware, tenantTrustProfileController.completeProfile);

// Update profile
router.put('/update-profile', authMiddleware, tenantTrustProfileController.updateProfile);
router.get('/data-user', authMiddleware, tenantTrustProfileController.getAuthenticatedUser);


// Upload image - single
router.post('/upload-image', authMiddleware, upload.single('image'), tenantTrustProfileController.uploadImage);



module.exports = router;


