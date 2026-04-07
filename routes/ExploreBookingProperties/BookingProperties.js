const express = require('express');
const router = express.Router();
const BookingProperties = require('../../controllers/ExploreBookingProperties/BookingProperties');
const upload = require("../../middlewares/upload"); // Assuming you use multer
const authMiddleware = require('../../middlewares/authMiddleware'); // Ensure authentication


// const authMiddleware = require('../../middlewares/authMiddleware'); // Ensure authentication

router.post('/booking/requests',authMiddleware, upload.none(),BookingProperties.createBookingRequest);
router.post('/get/all/properties',authMiddleware, upload.none(),BookingProperties.getAvailableProperties);
router.post('/booking/requests/update/',upload.none(), BookingProperties.updateBookingRequest);

router.post("/favourite/toggle",authMiddleware,upload.none(), BookingProperties.toggleFavouriteProperty); // Toggle favorite
router.post("/favourites/get/" ,authMiddleware,upload.none(), BookingProperties.getFavouriteProperties); 
router.post("/property/type/get/" ,authMiddleware,upload.none(), BookingProperties.getAvailablePropertiesByType); 
router.post("/property/type/rating/" ,authMiddleware,upload.none(), BookingProperties.getAvailablePropertyWithReviews); 

module.exports = router;
