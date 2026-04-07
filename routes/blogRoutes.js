const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');
const authMiddleware = require('../middlewares/authMiddleware'); // Ensure authentication


// Routes
router.post('/blog/add',authMiddleware, blogController.addBlog);
router.get('/blog/all', authMiddleware,blogController.getAllBlogs);
router.get('/blog/:id',authMiddleware, blogController.getBlogById);

module.exports = router;
