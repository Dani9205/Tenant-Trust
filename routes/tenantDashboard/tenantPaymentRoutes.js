const express = require("express");
const router = express.Router();
const tenantPaymentController = require("../../controllers/tenantDashboard/TenantPaymentController");
const upload = require("../../middlewares/upload"); // Assuming you use multer
const multer = require("multer");
const authMiddleware = require('../../middlewares/authMiddleware'); // Ensure authentication

// Add a tenant payment (with image upload)
router.post("/payment/detail/add",authMiddleware, upload.single("image"), tenantPaymentController.addTenantPayment);

// Get all payments by property ID
router.post("/recent/history/",authMiddleware,upload.none(), tenantPaymentController.getPaymentsByPropertyId);

// Re-upload/update a payment record (with image upload)
router.post("/payment/detail/update/",authMiddleware, upload.single("image"), tenantPaymentController.reuploadTenantPayment);
router.post("/payment/detail/single/",authMiddleware, upload.single("image"), tenantPaymentController.getSinglePaymentById);

module.exports = router;
