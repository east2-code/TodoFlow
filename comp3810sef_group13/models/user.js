const mongoose = require('mongoose');
const crypto = require('node:crypto');

// User document: username + salted password hash (never the plain password)
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 40,
  },
  salt: { type: String, required: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Create a random salt and a 64-byte scrypt hash
userSchema.statics.hashPassword = function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
};

// Compare the input password with the stored hash (timing-safe)
userSchema.methods.verifyPassword = function verifyPassword(password) {
  const input = crypto.scryptSync(password, this.salt, 64);
  const stored = Buffer.from(this.passwordHash, 'hex');
  return input.length === stored.length && crypto.timingSafeEqual(input, stored);
};

module.exports = mongoose.model('User', userSchema);
