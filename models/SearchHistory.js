const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');  // Adjust the path as per your project structure

const SearchHistory = sequelize.define('SearchHistory', 
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
        },
        uid: {
            type: DataTypes.INTEGER,
            allowNull: false,
            // You might want to add a foreign key constraint here
        },
        keyword: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: true, // Set to false if you want to enforce this field
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: true, // Set to false if you want to enforce this field
        },
        deletedAt: {
            type: DataTypes.DATE,
            allowNull: true, // Set to false if you want to enforce this field
            // This field can be used for soft deletes if you're using the `paranoid` option
        },
    },
    {
        // sequelize, // Passing the `sequelize` instance is required
        modelName: 'SearchHistory',
            tableName: 'searchhistories',

        timestamps: true, // Enable timestamps if you want `createdAt` and `updatedAt` fields
       // paranoid: true, // Enable soft deletes (if you want to use `deletedAt`)
    }
);

module.exports = SearchHistory;
