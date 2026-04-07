const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  receiverId: {
    type: DataTypes.INTEGER,
    allowNull: false,

  },
  senderId: {
    type: DataTypes.INTEGER,
    allowNull: false,

  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  body: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('latestUpdate', 'appExperience', 'maintenanceRequest', 'leaseExpiry', 'paymentDecision','NewMessage'),
    allowNull: false
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },

}, {
  tableName: 'notifications',
  timestamps: true, // adds createdAt and updatedAt automatically
});

module.exports = Notification;
