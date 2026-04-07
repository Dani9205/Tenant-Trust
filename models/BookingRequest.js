const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');
const Property = require('./PropertyModel');

const BookingRequest = sequelize.define('BookingRequest', {
    tenantId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    },
    propertyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Property,
            key: 'id'
        }
    },
    requestStatus: {
        type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'),
        defaultValue: 'Pending'
    }
}, {
    tableName: 'booking_requests',

    timestamps: true
});



module.exports = BookingRequest;
