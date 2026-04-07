// utils/generateToken.js
const jwt = require('jsonwebtoken');

const generateToken = (userId, userType) => {
  return jwt.sign({ id: userId, userType }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

module.exports = generateToken;
