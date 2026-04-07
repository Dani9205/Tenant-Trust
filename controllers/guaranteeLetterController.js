const GuaranteeLetter = require('../models/GuaranteeLetter');
const User = require('../models/User');

exports.getGuaranteeLetterByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const letter = await GuaranteeLetter.findOne({
      where: { userId },
      include: [{
        model: User,
        attributes: ['id', 'name', 'email', 'image']
      }]
    });

    if (!letter) {
      return res.status(404).json({
        success: false,
        message: 'Guarantee letter not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Guarantee letter fetched successfully',
      data: letter
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch guarantee letter'
    });
  }
};

exports.updateGuaranteeLetterByUser = async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid userId'
      });
    }

    const { date, name } = req.body;

    const letter = await GuaranteeLetter.findOne({ where: { userId } });

    if (!letter) {
      return res.status(404).json({
        success: false,
        message: 'Guarantee letter not found'
      });
    }

    await letter.update({ date, name });

    return res.status(200).json({
      success: true,
      message: 'Guarantee letter updated successfully',
      data: letter
    });

  } catch (error) {
    console.error('updateGuaranteeLetterByUser:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};



