const crypto = require('crypto'); // Ensure crypto is imported
const User = require('../models/User'); // Adjust the path to your User model

// Generates a 6-digit OTP and returns it along with its expiry time
exports.generateOtp = () => {
  const otp = Math.floor(100000 + Math.random() * 900000); // Generate a 6-digit OTP
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
  return {
    otp,
    otpExpiry
  };
};

