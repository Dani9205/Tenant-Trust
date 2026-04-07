const { DataTypes } = require("sequelize");
const sequelize = require("../config/db"); // Your DB connection file

const MaintenanceRequest = sequelize.define("MaintenanceRequest", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    propertyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    assignedToId: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    requestDate: {
     type: DataTypes.DATE,
            allowNull: true, // Set to false if you want to enforce this field
        },
     
    title: {
        type: DataTypes.STRING,
        // responceImages,responceImages
        allowNull: false,
    },
    responceDescription: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    images: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    responceImages: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    status: {
        type: DataTypes.ENUM("Pending", "Active", "Completed"),
        defaultValue: "Pending",
    },
 
}, {
    tableName: 'maintenance_requests',

    timestamps: true,
});

module.exports = MaintenanceRequest;
