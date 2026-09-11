const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Generate a signed JWT for a given user ID
 * @param {string} userId
 * @returns {string} JWT token
 */
function generateToken(userId) {
  return jwt.sign({ userId }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

/**
 * Verify a JWT token
 * @param {string} token
 * @returns {object} Decoded payload
 */
function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

module.exports = {
  generateToken,
  verifyToken,
};
