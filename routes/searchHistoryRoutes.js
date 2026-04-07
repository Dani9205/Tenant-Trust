const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();
const authMiddleware = require('../middlewares/authMiddleware'); // Ensure authentication
const {
    searchProperties,
    deleteSearchHistory,
    deleteAllSearchHistory,
    getSearchHistory,
} = require('../controllers/SearchHistoryController');


// Add search history
router.post('/add_search',authMiddleware,upload.none(), searchProperties);

// Delete a single search history item
router.delete('/delete_single_search',authMiddleware, deleteSearchHistory);

// Delete all search history items for a user
router.delete('/delete_all_search', authMiddleware,deleteAllSearchHistory);

// Get all search history items for a user
router.post('/gethistory',authMiddleware, getSearchHistory);

module.exports = router;
