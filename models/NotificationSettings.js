const { DataTypes } = require('sequelize');
const sequelize = require('../config/db'); // adjust path if needed

const NotificationSettings = sequelize.define("NotificationSettings", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  }, 

  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  appNotification: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: "1 = ON, 0 = OFF"
  },

  maintenanceNotification: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: "1 = ON, 0 = OFF"
  },

  propertyNotification: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: "1 = ON, 0 = OFF"
  },

  messageNotification: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: "1 = ON, 0 = OFF"
  },

  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },

  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }

}, {
  tableName: "notification_settings",
  timestamps: true
});

module.exports = NotificationSettings;