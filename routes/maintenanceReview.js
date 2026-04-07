const express = require("express");
const router = express.Router();
const multer = require('multer');
const upload = multer();
const authMiddleware = require('../middlewares/authMiddleware'); // Ensure authentication
const maintenenceReviewController = require("../controllers/maintenenceReview/maintenenceReviewController");




// POST - create review
router.post('/maintenance-review',authMiddleware, upload.none(),maintenenceReviewController.createMaintenanceReview);

// GET - get reviews for maintenance requests by property
router.post('/maintenance-review/list',authMiddleware,upload.none(),maintenenceReviewController.getMaintenanceReviews);


module.exports = router;
