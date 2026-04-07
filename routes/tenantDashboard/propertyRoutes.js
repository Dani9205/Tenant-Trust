const express = require("express");
const router = express.Router();
const propertyController = require("../../controllers/tenantDashboard/propertyController");
const upload = require("../../middlewares/upload"); // Assuming you use multer
const authMiddleware = require('../../middlewares/authMiddleware'); // Ensure authentication


// Route to add a rented property with image and video uploads
router.post("/rent/property/add", upload.fields([{ name: "images" }, { name: "video" }]), propertyController.createProperty);

// Route to get assigned properties (without file uploads)
router.post("/rent/property/assigned/",authMiddleware, upload.none(), propertyController.getUserAssignedProperties);
router.post("/detail/property/assigned/",authMiddleware, upload.none(), propertyController.getSingleAssignedPropertyDetail);
router.post("/all/property/assigned/",authMiddleware, upload.none(), propertyController.getAllAssignedPropertiesForTenants);


module.exports = router;
