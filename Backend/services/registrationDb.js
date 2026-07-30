const mongoose = require('mongoose');
const config = require('../config');

// Create a secondary connection for the registration database
const registrationDbConnection = mongoose.createConnection(config.registrationMongoUri, {
  maxPoolSize: 10,
  minPoolSize: 1,
});

registrationDbConnection.on('connected', () => {
  console.log('✅ Connected to Registration MongoDB');
});

registrationDbConnection.on('error', (err) => {
  console.error('❌ Could not connect to Registration MongoDB', err.message);
});

registrationDbConnection.on('disconnected', () => {
  console.warn('⚠️ Registration MongoDB disconnected');
});

module.exports = registrationDbConnection;
