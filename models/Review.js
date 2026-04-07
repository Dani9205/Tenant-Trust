const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');  // Adjust the path as per your project structure

const Review = sequelize.define('Review', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    propertyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
       
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
       
    },
    rating: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    feedback: {
        type: DataTypes.TEXT,
        allowNull: true
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
    tableName: 'reviews',
    timestamps: true
});

module.exports = Review;
