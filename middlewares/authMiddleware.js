const jwt = require('jsonwebtoken');
const { isBlacklisted } = require('../utils/blacklist');
const User = require('../models/User');

const auth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  if (isBlacklisted(token)) {
    return res.status(401).json({ success: false, message: 'Token is blacklisted. Please login again.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id, userType } = decoded;

    const user = await User.findOne({ where: { id, userType } }); // ✅ filter with userType

    if (!user || user.token !== token) {
      return res.status(401).json({ success: false, message: 'Token is no longer valid. Please login again.' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
  }
};

module.exports = auth;
