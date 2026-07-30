const mongoose = require('mongoose');
const registrationDbConnection = require('../services/registrationDb');

const registrationUserSchema = new mongoose.Schema({
  name: { type: String },
  studentNumber: { type: String },
  email: { type: String },
  gender: { type: String },
  branch: { type: String },
  phone: { type: String },
  unstopId: { type: String },
  residence: { type: String },
  isVerified: { type: Boolean },
  isPresentDay1: { type: Boolean },
  checkInTimeDay1: { type: Date },
  isPresentDay2: { type: Boolean },
  checkInTimeDay2: { type: Date },
}, { timestamps: true });

// Bind the model to the secondary connection
module.exports = registrationDbConnection.model('RegistrationUser', registrationUserSchema, 'registrations');
