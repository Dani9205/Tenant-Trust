const Block = require('../models/Block');
const User = require('../models/User');
const sequelize = require('../config/db'); // ✅ correct path to your sequelize instance


// ✅ Get all blocked users by myId
exports.getBlockedUsers = async (req, res) => {
    try {
        const { myId } = req.params;

        const blockedUsers = await Block.findAll({
            where: { myId },
            include: [
                {
                    model: User,
                    as: 'blockedUser',
                    attributes: ['id', 'name', 'email', 'image', 'userType'],
                    required: true,
                    where: { id: sequelize.col('Block.hisId') },
                },
            ],
        });

        res.status(200).json({
            success: true,
            message: 'fetched blocked users successfully',
            data: blockedUsers.map(b => b.blockedUser),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error', error });
    }
};

// ✅ Toggle block/unblock user
exports.toggleBlock = async (req, res) => {
    try {
        const { myId, hisId } = req.body;

        // Check if block already exists
        const existingBlock = await Block.findOne({ where: { myId, hisId } });

        if (existingBlock) {
            // Unblock
            await existingBlock.destroy();
            return res.status(200).json({ success: true, message: 'User unblocked successfully' });
        } else {
            // Block
            await Block.create({ myId, hisId });
            return res.status(200).json({ success: true, message: 'User blocked successfully' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error', error });
    }
};
