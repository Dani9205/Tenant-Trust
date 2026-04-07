const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Comment = sequelize.define('Comment', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  blogId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'blogs',  // should match your blogs table name
      key: 'id',
    },
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',  // should match your users table name
      key: 'id',
    },
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  tableName: 'comments',
  timestamps: true,
});

module.exports = Comment;
