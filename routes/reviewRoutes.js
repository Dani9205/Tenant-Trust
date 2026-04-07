const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();
const authMiddleware = require('../middlewares/authMiddleware'); // Ensure authentication

const {
    createReview,
    getStarReviews,
   
    // getReviewsByPropertyId,
    // // getPropertyReviewsWithRating
    // getOverallRatingByPropertyId
} = require('../controllers/reviewController');

// Routes
router.post('/reviews', authMiddleware,upload.none(), createReview); // Add a review
router.post('/reviews/getting/',authMiddleware, upload.none(), getStarReviews); // Get a review by ID
// router.post('/reviews/property/',authMiddleware, upload.none(), getReviewsByPropertyId); // Get reviews by property ID
// // router.post('/reviews/rating/',authMiddleware, upload.none(), getPropertyReviewsWithRating); // Get reviews with rating summary
// router.post('/reviews/rating/',authMiddleware, upload.none(), getOverallRatingByPropertyId); // Get reviews with rating summary

// router.get('/reviews', upload.none(), getAllReviews); // Get all reviews

module.exports = router;
