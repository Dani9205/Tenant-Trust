const GuaranteeLetter = require('../models/GuaranteeLetter');
const User = require('../models/User');

exports.getGuaranteeLetterByUser = async (req, res) => {
  try {
    const userId = req.user.id;

    const letter = await GuaranteeLetter.findOne({
      where: { userId },
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email','image']
        }
      ]
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
    const userId = req.user.id;
    const { date, name, body } = req.body;

    const letter = await GuaranteeLetter.findOne({
      where: { userId }
    });

    if (!letter) {
      return res.status(404).json({
        success: false,
        message: 'Guarantee letter not found'
      });
    }

    await letter.update({ date, name, body });

    res.status(200).json({
      success: true,
      message: 'Guarantee letter updated successfully',
      data: letter
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Failed to update guarantee letter'
    });
  }
};

