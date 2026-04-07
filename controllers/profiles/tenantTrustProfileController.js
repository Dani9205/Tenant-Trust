const User = require('../../models/User');

// Helper to sanitize user data
const sanitizeUser = (user) => {
  const { password, token, otp, otpExpiry, tokenExpiry, ...safeData } = user.toJSON();
  return safeData;
};

// Complete Profile
exports.completeProfile = async (req, res) => {
  const userId = req.user.id;
  const { name, email, gender, address, about, longitude, latitude } = req.body;

  try {
    const user = await User.findByPk(userId);

    if (!user || !user.registered) {
      return res.status(403).json({ success: false, message: 'User not verified.' });
    }

    user.name = name;
    user.email = email;
    user.gender = gender;
    user.address = address;
    user.longitude = longitude;
    user.latitude = latitude;
    user.about = about;
    user.profileStatus = 1; // Mark profile as completed

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile completed.',
      data: sanitizeUser(user),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};

// Update Profile
exports.updateProfile = async (req, res) => {
  const userId = req.user.id;
  const { name, email, gender, address, about, longitude, latitude } = req.body;

  try {
    const user = await User.findByPk(userId);

    if (!user || !user.registered) {
      return res.status(403).json({ success: false, message: 'User not verified.' });
    }

    Object.assign(user, {
      name: name || user.name,
      email: email || user.email,
      gender: gender || user.gender,
      address: address || user.address,
      longitude: longitude || user.longitude,
      latitude: latitude || user.latitude,
      about: about || user.about,
    });

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated.',
      data: sanitizeUser(user),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Update failed.', error: err.message });
  }
};


// Upload Image
const path = require('path');

exports.uploadImage = async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await User.findByPk(userId);
    if (!user || !user.registered) {
      return res.status(403).json({ success: false, message: 'User not verified.' });
    }

    const file = req.files?.[0] || req.file;

    if (file) {
      const fileName = file.filename; // multer stores the correct filename with extension
      const filePath = `uploads/${fileName}`; // relative path
      const fileExt = path.extname(fileName);

      // Save to DB
      user.image = filePath;
      user.imageType = fileExt;
      await user.save();

      return res.status(200).json({
        success: true,
        message: 'Image uploaded.',
        data: {
          image: filePath
        }
      });
    }

    return res.status(400).json({ success: false, message: 'No image file provided.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Upload failed.', error: err.message });
  }
};



exports.getAuthenticatedUser = async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.status(200).json({
      success: true,
       message: 'User data fetched',
      data: {
        ...sanitizeUser(user),
        token: user.token, // return the existing token
      },

    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
};




