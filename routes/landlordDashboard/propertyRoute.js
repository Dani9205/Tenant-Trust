const express = require("express");
const router = express.Router();
const landlordDashboardController = require("../../controllers/landlordDashboard/landlordDashboardController");
const upload = require("../../middlewares/upload"); // Assuming you use multer
const authMiddleware = require('../../middlewares/authMiddleware'); // Ensure authentication

// Route to fetch rented properties
router.post("/rent/property/renew/update/",authMiddleware, upload.fields([{ name: "images" }, { name: "video" }]), landlordDashboardController.updateProperty);
router.post("/recent/history/",authMiddleware,upload.none(), landlordDashboardController.getPaymentsByPropertyId);
router.post("/tenant/payment/status/update/",authMiddleware,upload.none(), landlordDashboardController.updatePaymentStatus);
router.post("/rented/",authMiddleware,upload.none(), landlordDashboardController.getAssignedProperties);
router.post("/notrented/",authMiddleware,upload.none(), landlordDashboardController.getUnassignedProperties);
router.post("/republish/property",authMiddleware,upload.none(), landlordDashboardController.republishProperty);

module.exports = router;
