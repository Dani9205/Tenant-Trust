const admin = require("../config/firebase");
const Notification = require('../models/Notification');
const User = require('../models/User');

// Send notification using FCM
exports.sendPushNotification = async (req, res) => {
  try {
    const { fcm_token, title, body, data } = req.body;

    if (!fcm_token || !title || !body) {
      return res.status(400).json({ message: "fcm_token, title, and body are required" });
    }

    const message = {
      token: fcm_token,
      notification: {
        title,
        body,
      },
      data: data || {}, // optional custom data
    };

    await admin.messaging().send(message);

    return res.status(200).json({
      success: true,
      message: "Notification sent successfully!",

    });
    

  } catch (error) {
    console.error("Firebase error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send notification",
      details: error.message,
    });
  }
};






// ✅ Add a new notification
exports.createNotification = async (req, res) => {
  try {
    const { receiverId, senderId, title, body, type } = req.body;

    if (!receiverId || !senderId || !title || !body || !type) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required.',
      });
    }

    const notification = await Notification.create({
      receiverId,
      senderId,
      title,
      body,
      type,
    });

    // include sender info in response
    const fullNotification = await Notification.findByPk(notification.id, {
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'name', 'image'],
        },
      ],
    });

    return res.status(201).json({
      success: true,
      message: 'Notification created successfully.',
      data: fullNotification,
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating notification.',
      error: error.message,
    });
  }
};

// ✅ Get all notifications by receiverId
exports.getNotificationsByReceiver = async (req, res) => {
  try {
    const { receiverId } = req.params;

    const notifications = await Notification.findAll({
      where: { receiverId },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'name', 'image'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json({
      success: true,
      message: 'Notifications fetched successfully.',
      data: notifications,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching notifications.',
      error: error.message,
    });
  }
};

// ✅ Update isRead by notification id
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByPk(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found.',
      });
    }

    notification.isRead = true;
    await notification.save();

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read successfully.',
      data: notification,
    });
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating notification.',
      error: error.message,
    });
  }
};

// ✅ Get notifications by receiverId and read/unread status
exports.getNotificationsByReadStatus = async (req, res) => {
  try {
    const { receiverId, status } = req.params;

    if (!['read', 'unread'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Use "read" or "unread".',
      });
    }

    const isRead = status === 'read';

    const notifications = await Notification.findAll({
      where: { receiverId, isRead },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'name', 'image'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json({
      success: true,
      message: `Notifications fetched successfully (${status}).`,
      data: notifications,
    });
  } catch (error) {
    console.error('Error fetching notifications by status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching notifications by status.',
      error: error.message,
    });
  }
};





