const GuaranteeLetter = require('../models/GuaranteeLetter');

// GET all guarantee letters
exports.getGuaranteeLetterById = async (req, res) => {
  try {

    const { id } = req.params;
        const letter = await GuaranteeLetter.findByPk(id);

        if (!letter) {
            return res.status(404).json({ success: false, message: 'letter not found' });
        }

        res.status(200).json({ success: true,message:'letter fetched successfully', data: letter });




  } catch (error) {
    console.error(error);
    res.status(500).json({  success: false,message: 'Failed to fetch guarantee letters' });
  }
};

// UPDATE a guarantee letter by ID
exports.updateGuaranteeLetter = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, name, body } = req.body;

    const letter = await GuaranteeLetter.findByPk(id);
    if (!letter) {
      return res.status(404).json({  success: false,message: 'Guarantee letter not found' });
    }

    await letter.update({ date, name, body });
    res.status(200).json({ success: true, message: 'Guarantee letter updated successfully', letter });
  } catch (error) {
    console.error(error);
    res.status(500).json({  success: false,message: 'Failed to update guarantee letter' });
  }
};
