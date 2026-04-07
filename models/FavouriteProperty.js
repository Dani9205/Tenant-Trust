const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const FavouriteProperty = sequelize.define("FavouriteProperty", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "Users",
            key: "id"
        }
    },
    propertyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "Properties",
            key: "id"
        }
    }
}, {
    timestamps: true,
    tableName: "favourite_properties"
});

module.exports = FavouriteProperty;
