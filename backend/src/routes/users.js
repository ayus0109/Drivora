const express = require('express');
const { authenticate } = require('../middleware/auth');
const User = require('../models/User');
const File = require('../models/File');

const router = express.Router();
const FIFTEEN_GB = 15 * 1024 * 1024 * 1024; // 16,106,127,360 bytes

/**
 * GET /api/users/me
 * Returns current authenticated user profile & accurate storage quota details
 * Self-heals any desynchronization by summing active file sizes
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    // Enterprise self-healing storage reconciliation (Google/Dropbox standard)
    const userFiles = await File.find({ owner: req.user._id });
    const actualBytes = userFiles.reduce((sum, f) => sum + (f.sizeBytes || 0), 0);

    let user = req.user;
    let needsSave = false;

    if (user.usedStorageBytes !== actualBytes) {
      user.usedStorageBytes = actualBytes;
      needsSave = true;
    }

    if (!user.quotaBytes || user.quotaBytes < FIFTEEN_GB) {
      user.quotaBytes = FIFTEEN_GB;
      needsSave = true;
    }

    if (needsSave) {
      await user.save();
    }

    res.json({
      success: true,
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
 * POST /api/users/sync-storage
 * Manually trigger instant storage reconciliation
 */
router.post('/sync-storage', authenticate, async (req, res, next) => {
  try {
    const userFiles = await File.find({ owner: req.user._id });
    const actualBytes = userFiles.reduce((sum, f) => sum + (f.sizeBytes || 0), 0);

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.usedStorageBytes = actualBytes;
    if (!user.quotaBytes || user.quotaBytes < FIFTEEN_GB) {
      user.quotaBytes = FIFTEEN_GB;
    }
    await user.save();

    res.json({
      success: true,
      message: 'Storage quota synchronized successfully.',
      storage: {
        usedStorageBytes: user.usedStorageBytes,
        quotaBytes: user.quotaBytes,
        fileCount: userFiles.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
