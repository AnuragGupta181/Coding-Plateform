const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, select: false },
  mobileNumber: { type: String, default: null },
  isVerified: { type: Boolean, default: false },
  role: { type: String, enum: ['candidate', 'admin'], default: 'candidate' }
}, { timestamps: true });

// Password hashing removed for now to resolve middleware 'next' conflicts.
// We will implement hashing manually in the controller when needed.

module.exports = mongoose.model('User', userSchema);
