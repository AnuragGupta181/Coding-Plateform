const mongoose = require('mongoose');
const config = require('../config');

let registrationDbConnection;

if (!config.registrationMongoUri) {
  console.warn('⚠️ REGISTRATION_MONGODB_URI is not set in env! Registration fallback will be disabled.');
  // Return dummy or main connection if not configured
  registrationDbConnection = mongoose.connection;
} else {
  console.log('🔄 Connecting to Registration MongoDB...');
  registrationDbConnection = mongoose.createConnection(config.registrationMongoUri, {
    maxPoolSize: 80,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 15000,
  });

  registrationDbConnection.on('connected', () => {
    console.log('✅ Connected to Registration MongoDB (Secondary DB)');
  });

  registrationDbConnection.on('error', (err) => {
    console.error('❌ Could not connect to Registration MongoDB:', err.message);
  });

  registrationDbConnection.on('disconnected', () => {
    console.warn('⚠️ Registration MongoDB disconnected');
  });
}

module.exports = registrationDbConnection;
