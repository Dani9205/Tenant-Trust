const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Chat = sequelize.define('Chat', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  senderId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users', // references the 'users' table
      key: 'id',
    },
    allowNull: false,
  },
  receiverId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id',
    },
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'text',
  },
  readStatus: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  deletedBy: {
    type: DataTypes.TEXT, // Use TEXT instead of LONGTEXT
    allowNull: true,
    defaultValue: JSON.stringify([]), // Initialize with an empty array as a JSON string
  },
}, {
  // sequelize,
  tableName: 'chats',
  timestamps: true,
});



module.exports = Chat;
