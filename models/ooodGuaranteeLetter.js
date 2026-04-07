const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const GuaranteeLetter = sequelize.define('GuaranteeLetter', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  date: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  body: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  tableName: 'guaranteeLetter',
  timestamps: true, // adds createdAt and updatedAt automatically
});

module.exports = GuaranteeLetter;
