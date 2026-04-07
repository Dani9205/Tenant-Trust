const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Block = sequelize.define('Block', 
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        myId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'myId', // Map to camelCase if necessary
        },
        hisId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'hisId', // Map to camelCase if necessary
        },
        createdAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            field: 'createdAt', // Map to camelCase if necessary
        },
        updatedAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            onUpdate: DataTypes.NOW,
            field: 'updatedAt', // Map to camelCase if necessary
        },
    },
    {
        // sequelize,
        modelName: 'Block',
        tableName: 'blocks',
        timestamps: true,
        underscored: true, // This will convert camelCase to snake_case
    }
);

module.exports = Block;
