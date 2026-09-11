const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email address',
      ],
    },
    password: {
      type: String,
      required: function () {
        // Password is only required for traditional email/password accounts
        return this.authProvider === 'local';
      },
      minlength: [6, 'Password must be at least 6 characters long'],
    },
    googleId: {
      type: String,
      default: null,
      sparse: true,
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    name: {
      type: String,
      default: null,
    },
    avatar: {
      type: String,
      default: null,
    },
    usedStorageBytes: {
      type: Number,
      default: 0,
      min: 0,
    },
    quotaBytes: {
      type: Number,
      default: 15 * 1024 * 1024 * 1024, // 15 GB default (Google Drive standard)
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving if modified and present
userSchema.pre('save', async function (next) {
  if (!this.password || !this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Instance method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Transform output to remove sensitive fields
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
