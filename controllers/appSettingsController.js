//const { NotificationSettings, User } = require("../models");
const User = require("../models/User");
const ContactUs = require("../models/ContactUs");
const NotificationSettings = require("../models/NotificationSettings");


// GET Notification Settings 
const getNotificationSettings = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User id is required",
      });
    } 
    let settings = await NotificationSettings.findOne({
      where: { userId },
      include: [
        {
          model: User,
          as: "user",
        },
      ],
    });
    // create default if not exists
    if (!settings) {
      settings = await NotificationSettings.create({
        userId,
        appNotification: true,
        maintenanceNotification: true,
        propertyNotification: true,
        messageNotification: true,
      });
      settings = await NotificationSettings.findOne({
        where: { id: settings.id },
        include: [
          {
            model: User,
            as: "user",
          },
        ],
      });
    }
    const responseData = {
      id: settings.id,
      userId: settings.userId,
      appNotification: settings.appNotification ? "ON" : "OFF",
      maintenanceNotification: settings.maintenanceNotification ? "ON" : "OFF",
      propertyNotification: settings.propertyNotification ? "ON" : "OFF",
      messageNotification: settings.messageNotification ? "ON" : "OFF",

      user: settings.user || null,
    };
    return res.status(200).json({
      success: true,
      message: "Notification settings fetched successfully",
      data: responseData,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};











// UPDATE Notification Settings
const updateNotificationSettings = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);



    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User id is required",
      });
    }

    // 🔥 Convert ON/OFF → BOOLEAN
    const toBool = (value) => {
      if (!value) return undefined;

      const val = value.toString().toUpperCase();

      if (val === "ON") return true;
      if (val === "OFF") return false;

      return undefined;
    };

    const {
      appNotification,
      maintenanceNotification,
      propertyNotification,
      messageNotification,
    } = req.body;

    let settings = await NotificationSettings.findOne({
      where: { userId },
    });
    if (!settings) {
      settings = await NotificationSettings.create({
        userId,
        appNotification: toBool(appNotification) ?? true,
        maintenanceNotification: toBool(maintenanceNotification) ?? true,
        propertyNotification: toBool(propertyNotification) ?? true,
        messageNotification: toBool(messageNotification) ?? true,
      });
    } else {
      await settings.update({
        appNotification: toBool(appNotification) ?? settings.appNotification,
        maintenanceNotification: toBool(maintenanceNotification) ?? settings.maintenanceNotification,
        propertyNotification: toBool(propertyNotification) ?? settings.propertyNotification,
        messageNotification: toBool(messageNotification) ?? settings.messageNotification,
      });
    }

    // 🔥 reload updated data
    const updatedData = await NotificationSettings.findOne({
      where: { userId },
    });

    return res.status(200).json({
      success: true,
      message: "Notification settings updated successfully",
      data: {
        id: updatedData.id,
        userId: updatedData.userId,
        appNotification: updatedData.appNotification ? "ON" : "OFF",
        maintenanceNotification: updatedData.maintenanceNotification ? "ON" : "OFF",
        propertyNotification: updatedData.propertyNotification ? "ON" : "OFF",
        messageNotification: updatedData.messageNotification ? "ON" : "OFF",
      },
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};











const createContactUs = async (req, res) => {
  try {
    const { userId, name, email, subject, message } = req.body;

    // 🔹 Step 1: Basic Validation
    if (!userId || !name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // 🔹 Step 2: Check if user exists
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 🔹 Step 3: Save Contact
    const contact = await ContactUs.create({
      userId,
      name,
      email,
      subject,
      message,
    });

    // 🔹 Step 4: Success Response
    return res.status(201).json({
      success: true,
      message: "Contact submitted successfully",
      data: contact,
    });

  } catch (error) {
    console.error("ContactUs Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};



module.exports = {
  getNotificationSettings,
  updateNotificationSettings,
  createContactUs
};

