const mongoose = require('mongoose');

const verificationCodeSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      index: true,
    },
    code: {
      type: String,
      required: [true, 'Verification code is required'],
    },
    type: {
      type: String,
      enum: ['SIGNUP', 'PASSWORD_RESET'],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      index: { expires: 0 }, // TTL index: auto-delete document when expiresAt arrives
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('VerificationCode', verificationCodeSchema);
