const User = require('../models/User');
const { generateOtp } = require('../utils/otpUtils');
const generateToken = require('../utils/generateToken');
const { setLatestToken } = require('../utils/blacklist');
const jwt = require('jsonwebtoken');

const twilio = require('twilio')(
  process.env.TWILIO_ACCOUNT_SID || 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  process.env.TWILIO_AUTH_TOKEN || 'dummytoken'
);

exports.sendOtp = async (req, res) => {
  try {
    const { countryCode, phoneNumber, userType } = req.body;

    if (!countryCode || !phoneNumber || !userType) {
      return res.status(400).json({
        success: false,
        message: 'countryCode, phoneNumber, and userType are required'
      });
    }

    const { otp, otpExpiry } = generateOtp(); // ✅ Fix here

    let user = await User.findOne({ where: { countryCode, phoneNumber,userType } });
    let isNewUser = false;

    if (!user) {
      // Create new user
      user = await User.create({
        countryCode,
        phoneNumber,
        userType,
        otp: otp.toString(),          // ✅ ensure it's string
        otpExpiry,
        registered: false,
      });
      isNewUser = true;
    } else {
      // Update OTP and expiry
      user.otp = otp.toString();     // ✅ ensure it's string
      user.otpExpiry = otpExpiry;

      // If userType is missing, set it
      if (!user.userType) {
        user.userType = userType;
      }

      await user.save();
    }

    // Send OTP (disable in production)
    // await sendOtpToPhone(countryCode + phoneNumber, otp);

    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      data: process.env.NODE_ENV !== 'production' ? { otp,      isNewUser,
      } : {}
    });
  } catch (error) {
    console.error('sendOtp error:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong',
      error: error.message
    });
  }
};



exports.verifyOtp = async (req, res) => {
  const { countryCode, phoneNumber, otp,userType } = req.body;

  if (!countryCode || !phoneNumber || !otp||!userType) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  try {
    const user = await User.findOne({ where: { countryCode, phoneNumber,userType } });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP.' });
    }

    if (new Date() > new Date(user.otpExpiry)) {
      return res.status(400).json({ success: false, message: 'OTP has expired.' });
    }

    // Generate token
    const token = generateToken(user.id, user.userType);
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);

    // Update user fields
    user.otp = null;
    user.otpExpiry = null;
    user.token = token;
    user.tokenExpiry = expiryDate;
    user.registered = true;

    await user.save();

    // Create a sanitized user object
    const { password, token: _, otp: __, otpExpiry: ___, ...safeUser } = user.toJSON();

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully!',
      data: {
        ...  safeUser,
        token,
        registered: true,
        isNewUser: false,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP.',
      error: error.message,
    });
  }
};






// controllers/authController.js
const { blacklistToken } = require('../utils/blacklist');

exports.logout = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (token) {
    blacklistToken(token); // mark token as blacklisted
  }

  res.status(200).json({ success: true, message: 'Logged out successfully.' });
};
