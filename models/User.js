const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');  // Adjust path based on your project structure

const User = sequelize.define("User", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,  // Ensure duplicate emails are allowed
    },
    isOnline: {
        type: DataTypes.BOOLEAN,
        allowNull: true
    },
    lastSeen: {
        type: DataTypes.STRING,
        allowNull: true
    },

    password: {
        type: DataTypes.STRING,
        allowNull: true
    },
    token: {
        type: DataTypes.STRING,
        allowNull: true
    },
    tokenExpiry: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    otpExpiry: {
        type: DataTypes.DATE,
        allowNull: true
    },
    otp: {
        type: DataTypes.STRING(6),
        allowNull: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    dp: { // Added alias for compatibility
        type: DataTypes.STRING,
        allowNull: true,
        get() {
            return this.getDataValue('image'); // Map dp to image
        },
        set(value) {
            this.setDataValue('image', value);
        },
    },
    gender: {
        type: DataTypes.STRING,
        allowNull: true
    },
    image: {
        type: DataTypes.STRING,
        allowNull: true
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    latitude: {
        type: DataTypes.DECIMAL(9, 6),
        allowNull: true
    },
    longitude: {
        type: DataTypes.DECIMAL(9, 6),
        allowNull: true
    },
    phoneNumber: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    countryCode: {
        type: DataTypes.STRING(5),
        allowNull: true
    },
    about: {
        type: DataTypes.STRING,
        allowNull: true
    },
    profileStatus: {
        type: DataTypes.STRING,
        allowNull: true
    },
    userType: {
        type: DataTypes.ENUM('tenant', 'landlord'),
        allowNull: true
    },
    registered: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false
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
    tableName: "users",
    timestamps: true
});

module.exports = User;
