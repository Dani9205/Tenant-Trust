// utils/blacklist.js
const latestTokens = new Map(); // userId => latest token
const blacklistedTokens = new Set(); // Set of invalidated tokens

// Store the latest valid token for a user
const setLatestToken = (userId, token) => {
  latestTokens.set(userId, token);
};

// Check if the provided token is the latest one for the user
const isLatestToken = (userId, token) => {
  return latestTokens.get(userId) === token;
};

// Add a token to the blacklist (e.g., during logout)
const blacklistToken = (token) => {
  blacklistedTokens.add(token);
};

// Check if a token is blacklisted
const isBlacklisted = (token) => {
  return blacklistedTokens.has(token);
};

module.exports = {
  setLatestToken,
  isLatestToken,
  blacklistToken,
  isBlacklisted,
};
