const jwt = require('jsonwebtoken');
const config = require('./config');

/**
 * Generates an Admin JWT token for load testing
 */
function generateAdminToken(adminId = '6a369defd17d256a5583944b') {
  return jwt.sign({ id: adminId, role: 'admin' }, config.JWT_SECRET);
}

/**
 * Generates a Candidate JWT token for load testing
 */
function generateCandidateToken(candidateId = '6a4f7bec860ffe0455d2ff83') {
  return jwt.sign({ id: candidateId, role: 'candidate' }, config.JWT_SECRET);
}

module.exports = {
  generateAdminToken,
  generateCandidateToken
};
