const express = require("express");
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// POST -> /api/notifications/send
router.post("/send",notificationController.sendPushNotification);



// POST - Add a new notification
router.post('/add', notificationController.createNotification);

// GET - Get all notifications by receiverId
router.get('/receiver/:receiverId', notificationController.getNotificationsByReceiver);

// PATCH - Mark a notification as read
router.patch('/:id/read', notificationController.markAsRead);

// GET - Get notifications by receiverId and read/unread status
router.get('/receiver/:receiverId/status/:status', notificationController.getNotificationsByReadStatus);

module.exports = router;
