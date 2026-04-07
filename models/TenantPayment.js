const { DataTypes } = require('sequelize');
const sequelize = require('../config/db'); // Adjust this to your actual DB connection

const TenantPayment = sequelize.define('TenantPayment', {
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    image: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    rentPaidDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    paymentStatus: {
        type: DataTypes.ENUM('Pending', 'On-Time Pay', 'Late Pay'),
        allowNull: false,
        defaultValue: 'Pending',
    },
    propertyId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        
    },
}, {
    tableName: "tenantpayment",

    timestamps: true,
});



module.exports = TenantPayment;
