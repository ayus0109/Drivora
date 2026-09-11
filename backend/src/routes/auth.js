const express = require('express');
const User = require('../models/User');
const { generateToken } = require('../services/jwt');

const router = express.Router();

/**
 * POST /api/auth/signup
 * Register a new user
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
    const { email, password, name, avatar, googleId } = req.body;

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
      // Strict Security: If user account has a password, require and verify it
      if (user.password) {
        if (!password) {
          return res.status(401).json({
            success: false,
            requiresPassword: true,
            message: 'This account is password-protected. Please enter your account password to verify your identity.',
          });
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
          return res.status(401).json({
            success: false,
            message: 'Invalid password. Access denied.',
          });
        }
      }

      // Link Google profile attributes if not already present
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
      // Just-In-Time (JIT) Account Provisioning: require password to prevent unauthenticated takeovers
      if (!password || password.length < 6) {
        return res.status(400).json({
          success: false,
          requiresPassword: true,
          message: 'Please enter a password of at least 6 characters to secure your account.',
        });
      }

      const defaultName = name || normalizedEmail.split('@')[0];
      const defaultAvatar =
        avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(
          defaultName
        )}&background=2563eb&color=fff&bold=true`;

      user = await User.create({
        email: normalizedEmail,
        password: password,
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
