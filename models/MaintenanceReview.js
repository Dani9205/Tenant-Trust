const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const MaintenanceReview = sequelize.define("MaintenanceReview", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    maintenanceRequestId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "maintenance_requests", // Make sure this matches the actual table name
            key: "id"
        },
        onDelete: "CASCADE"
    },
     userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
   
    rating: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    feedback: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: "maintenance_reviews",
    timestamps: true
});

module.exports = MaintenanceReview;
