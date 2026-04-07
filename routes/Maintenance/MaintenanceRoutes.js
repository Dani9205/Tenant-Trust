const express = require('express');
const router = express.Router();
const MaintenanceController = require('../../controllers/Maintenance/MaintenanceController');
const authMiddleware = require('../../middlewares/authMiddleware'); // Ensure authentication
const upload = require("../../middlewares/multerConfig"); // Import Multer config

router.post("/maintenance/request", authMiddleware, upload.array("images", 10), MaintenanceController.createRequest);
router.post("/maintenance/request/update", authMiddleware, upload.array("images", 10), MaintenanceController.updateRequest);
router.post("/maintenance/request/landlord/status", authMiddleware, upload.array("images", 10), MaintenanceController.getRequestsByStatusAndUserId);
router.post("/maintenance/requests/tenant/status", authMiddleware, upload.array("images", 10), MaintenanceController.getRequestsByStatusAndAssignedToId);
router.post("/maintenance/request/delete", authMiddleware, upload.array("images", 10), MaintenanceController.deleteRequest);
router.post("/maintenance/request/respond", authMiddleware, upload.array("responseImages", 10), MaintenanceController.respondToRequest);
router.post("/maintenance/request/fetched", authMiddleware, upload.array("responseImages", 10), MaintenanceController.getLandlordPropertiesWithMaintenanceCountAndDetails);

module.exports = router;
