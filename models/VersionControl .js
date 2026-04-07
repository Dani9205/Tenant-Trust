const { DataTypes } = require('sequelize');
const sequelize = require('../config/db'); // Adjust the path based on your project structure

const VersionControl = sequelize.define('VersionControl', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
    },
    deviceType: {
        type: DataTypes.ENUM('android', 'ios'),
        allowNull: false,
    },
    versionNumber: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('stable', 'outdated', 'latest', 'beta'),
        allowNull: false,
    },
    releaseDate: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
    updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'version_control',
    timestamps: true,
});

module.exports = VersionControl;
