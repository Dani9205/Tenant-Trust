const Comment = require('../models/Comment');
const User = require('../models/User');

class CommentController {
  constructor(io) {
    this.io = io;

    io.on('connection', (socket) => {
      console.log('🔌 New socket connected:', socket.id);

      // --- Join specific blog room ---
      socket.on('joinBlog', (blogId) => {
        socket.join(`blog_${blogId}`);
        console.log(`User joined blog_${blogId}`);
      });

      // --- Fetch all comments for a blog ---
      socket.on('getComments', async (blogId) => {
        try {
          const comments = await Comment.findAll({
            where: { blogId },
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'name', 'image'],
              },
            ],
            order: [['createdAt', 'DESC']],
          });  

          // Send comments only to this socket
          socket.emit('commentsData', comments);
        } catch (err) {
          console.error('Error fetching comments:', err);
          socket.emit('error', { message: 'Failed to load comments.' });
          
        }
      });

      // --- Add a new comment ---
      socket.on('addComment', async (data) => {
        try {
          const newComment = await Comment.create({
            blogId: data.blogId,
            userId: data.userId,
            description: data.description,

          });

          const commentWithUser = await Comment.findOne({
            where: { id: newComment.id },
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'name', 'image'],
              },
            ],
          });


          // Broadcast to everyone in this blog room
          io.to(`blog_${data.blogId}`).emit('newComment', commentWithUser);
        } catch (err) {
          console.error('Error adding comment:', err);
          socket.emit('error', { message: 'Failed to add comment.' });
        }
      });

      socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
      });

    });
  }
}

module.exports = CommentController;



