const express = require("express");
const router = express.Router();
const propertyController = require("../../controllers/properties/propertyController");
const upload = require("../../middlewares/upload"); // Assuming you use multer
const authMiddleware = require('../../middlewares/authMiddleware'); // Ensure authentication


router.post("/property/add",authMiddleware, upload.fields([{ name: "images" }, { name: "video" }]), propertyController.createProperty);



router.post("/properties/update/",authMiddleware, upload.fields([{ name: "images" }, { name: "video" }]), propertyController.updateProperty);

// Route for deleting a property
router.post("/property/delete/",authMiddleware,upload.none(), propertyController.deleteProperty);

module.exports = router;
