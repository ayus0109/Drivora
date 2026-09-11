const express = require('express');
const User = require('../models/User');
const VerificationCode = require('../models/VerificationCode');
const { generateOTP, sendOTPEmail } = require('../services/emailService');
const { generateToken } = require('../services/jwt');

const router = express.Router();

/**
 * POST /api/auth/send-signup-otp
 * Validate email & send 6-digit verification code for new registration
 */
router.post('/send-signup-otp', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address.',
      });
    }

    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    const normalizedEmail = email.toLowerCase().trim();

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists. Please sign in instead.',
      });
    }

    // Clean up any existing signup codes for this email
    await VerificationCode.deleteMany({ email: normalizedEmail, type: 'SIGNUP' });

    // Generate and save 6-digit OTP
    const code = generateOTP();
    await VerificationCode.create({
      email: normalizedEmail,
      code,
      type: 'SIGNUP',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    const sendResult = await sendOTPEmail(normalizedEmail, code, 'SIGNUP');

    res.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${normalizedEmail}.`,
      delivered: sendResult.delivered,
      devCode: sendResult.delivered ? undefined : code,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/verify-signup-otp
 * Verify 6-digit code and create user account
 */
router.post('/verify-signup-otp', async (req, res, next) => {
  try {
    const { email, code, password, name } = req.body;

    if (!email || !code || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email, verification code, and password are required.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verify OTP code
    const validCode = await VerificationCode.findOne({
      email: normalizedEmail,
      code: code.trim(),
      type: 'SIGNUP',
      expiresAt: { $gt: new Date() },
    });

    if (!validCode) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code. Please request a new code.',
      });
    }

    // Delete used code
    await VerificationCode.deleteOne({ _id: validCode._id });

    // Ensure email wasn't taken during the verification window
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    const defaultName = name?.trim() || normalizedEmail.split('@')[0];
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      defaultName
    )}&background=2563eb&color=fff&bold=true`;

    const user = await User.create({
      email: normalizedEmail,
      password,
      name: defaultName,
      avatar: defaultAvatar,
      quotaBytes: 15 * 1024 * 1024 * 1024, // 15 GB
      usedStorageBytes: 0,
    });

    const token = generateToken(user._id.toString());

    res.status(201).json({
      success: true,
      message: 'Account verified and created successfully.',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        authProvider: user.authProvider || 'local',
        usedStorageBytes: user.usedStorageBytes,
        quotaBytes: user.quotaBytes,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/send-reset-otp
 * Send password reset 6-digit code to registered email
 */
router.post('/send-reset-otp', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please enter your account email address.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No Drivora account found with this email address.',
      });
    }

    // Clean up any prior reset codes
    await VerificationCode.deleteMany({ email: normalizedEmail, type: 'PASSWORD_RESET' });

    const code = generateOTP();
    await VerificationCode.create({
      email: normalizedEmail,
      code,
      type: 'PASSWORD_RESET',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    const sendResult = await sendOTPEmail(normalizedEmail, code, 'PASSWORD_RESET');

    res.json({
      success: true,
      message: `A password reset code has been sent to ${normalizedEmail}.`,
      delivered: sendResult.delivered,
      devCode: sendResult.delivered ? undefined : code,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/reset-password
 * Verify reset code and set new account password
 */
router.post('/reset-password', async (req, res, next) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, reset code, and new password are required.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const validCode = await VerificationCode.findOne({
      email: normalizedEmail,
      code: code.trim(),
      type: 'PASSWORD_RESET',
      expiresAt: { $gt: new Date() },
    });

    if (!validCode) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset code. Please request a new code.',
      });
    }

    await VerificationCode.deleteOne({ _id: validCode._id });

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully! You can now sign in with your new password.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/signup
 * Legacy direct signup route (fallback)
 */
router.post('/signup', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    const user = await User.create({
      email: normalizedEmail,
      password,
    });

    const token = generateToken(user._id.toString());

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        authProvider: user.authProvider || 'local',
        usedStorageBytes: user.usedStorageBytes,
        quotaBytes: user.quotaBytes,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/login
 * Authenticate user & return JWT
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const token = generateToken(user._id.toString());

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        authProvider: user.authProvider || 'local',
        usedStorageBytes: user.usedStorageBytes,
        quotaBytes: user.quotaBytes,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/google
 * Authenticate or provision user via Google SSO
 * Body: { email, name, avatar, googleId }
 */
router.post('/google', async (req, res, next) => {
  try {
    const { email, name, avatar, googleId } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Google account email is required.',
      });
    }

    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    const normalizedEmail = email.toLowerCase().trim();

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address format.',
      });
    }

    // Check if user already exists
    let user = await User.findOne({ email: normalizedEmail });
    const FIFTEEN_GB = 15 * 1024 * 1024 * 1024;

    if (user) {
      // Seamless Google Authentication: Google is the verified Identity Provider
      let isModified = false;
      if (googleId && !user.googleId) {
        user.googleId = googleId;
        isModified = true;
      }
      if (name && !user.name) {
        user.name = name;
        isModified = true;
      }
      if (avatar && !user.avatar) {
        user.avatar = avatar;
        isModified = true;
      }
      // Upgrade existing quota to 15 GB minimum
      if (!user.quotaBytes || user.quotaBytes < FIFTEEN_GB) {
        user.quotaBytes = FIFTEEN_GB;
        isModified = true;
      }

      if (isModified) {
        await user.save();
      }
    } else {
      // 1-Click Provisioning for new Google user
      const defaultName = name || normalizedEmail.split('@')[0];
      const defaultAvatar =
        avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(
          defaultName
        )}&background=2563eb&color=fff&bold=true`;

      user = await User.create({
        email: normalizedEmail,
        password: `DrivoraGoogle_${Math.random().toString(36).slice(-8)}!`,
        name: defaultName,
        avatar: defaultAvatar,
        googleId:
          googleId ||
          `google_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        authProvider: 'google',
        quotaBytes: FIFTEEN_GB,
        usedStorageBytes: 0,
      });
    }

    const token = generateToken(user._id.toString());

    res.json({
      success: true,
      message: 'Authenticated with Google successfully.',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        authProvider: user.authProvider || 'google',
        usedStorageBytes: user.usedStorageBytes,
        quotaBytes: user.quotaBytes,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/logout
 * Client-side logout acknowledgment
 */
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully.',
  });
});

module.exports = router;
