const { DataTypes } = require('sequelize');
const sequelize = require('../config/db'); 
const User = require('../models/User'); // Ensure correct path

const Property = sequelize.define('Property', {
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      assignedToId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      propertyType: {
        type: DataTypes.ENUM('Residential', 'Commercial', 'New Listings','Vacation Rental'),
        allowNull: false,
      },
      saleOrRent: {
        type: DataTypes.ENUM('Sale', 'Rent','Lease'),
        allowNull: false,
      },
      paymentFrequency: {
        type: DataTypes.ENUM('Monthly', 'Yearly'),
        allowNull: true,
      },
amount: {
  type: DataTypes.DECIMAL, // no limit on digits
  allowNull: false
}
,



      bedrooms: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      bathrooms: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      startDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      endDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      rentDeadline: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      paymentStatus: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      location: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: false,
      },
      longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      images: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      videoUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    
      amenities: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
}, {
    tableName: "properties",  // Correct placement
    timestamps: true,  // Ensures Sequelize handles createdAt and updatedAt
});

Property.belongsTo(User, { foreignKey: 'userId' });

module.exports = Property;
