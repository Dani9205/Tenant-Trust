const Blog = require('../models/Blog');

// Create a new blog
exports.addBlog = async (req, res) => {
    try {
        const { title, description, images, videos } = req.body;
        const newBlog = await Blog.create({ title, description, images, videos });
        res.status(201).json({
            success: true,
            message: 'Blog created successfully',
            data: newBlog
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// Get all blogs
exports.getAllBlogs = async (req, res) => {
    try {
        const blogs = await Blog.findAll({ order: [['createdAt', 'DESC']] });
        res.status(200).json({
            success: true,
            message:'blog fetched successfully',
            // count: blogs.length,
            data: blogs
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// Get blog by ID
exports.getBlogById = async (req, res) => {
    try {
        const { id } = req.params;
        const blog = await Blog.findByPk(id);

        if (!blog) {
            return res.status(404).json({ success: false, message: 'Blog not found' });
        }

        res.status(200).json({ success: true,message:'blog fetched successfully', data: blog });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};
