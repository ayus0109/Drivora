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

/**
 * GET /api/users/storage-analytics
 * Category-level breakdown (Documents, Images, Media, Archives, Other, Trash)
 */
router.get('/storage-analytics', authenticate, async (req, res, next) => {
  try {
    const allFiles = await File.find({ owner: req.user._id });

    const categories = {
      documents: { label: 'Documents & Text', bytes: 0, count: 0, color: '#3b82f6' },
      images: { label: 'Images & Photos', bytes: 0, count: 0, color: '#10b981' },
      media: { label: 'Audio & Video', bytes: 0, count: 0, color: '#8b5cf6' },
      archives: { label: 'Archives & Packages', bytes: 0, count: 0, color: '#f59e0b' },
      others: { label: 'Other Files', bytes: 0, count: 0, color: '#64748b' },
      trash: { label: 'Trash (Pending Purge)', bytes: 0, count: 0, color: '#ef4444' },
    };

    for (const f of allFiles) {
      const bytes = f.sizeBytes || 0;
      if (f.isTrash) {
        categories.trash.bytes += bytes;
        categories.trash.count += 1;
        continue;
      }

      const mime = (f.mimeType || '').toLowerCase();
      const name = (f.name || '').toLowerCase();

      if (
        mime.includes('pdf') ||
        mime.includes('word') ||
        mime.includes('text') ||
        mime.includes('document') ||
        mime.includes('presentation') ||
        mime.includes('sheet') ||
        name.match(/\.(pdf|doc|docx|txt|md|csv|xlsx|ppt|pptx)$/i)
      ) {
        categories.documents.bytes += bytes;
        categories.documents.count += 1;
      } else if (
        mime.startsWith('image/') ||
        name.match(/\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i)
      ) {
        categories.images.bytes += bytes;
        categories.images.count += 1;
      } else if (
        mime.startsWith('video/') ||
        mime.startsWith('audio/') ||
        name.match(/\.(mp4|webm|mkv|mp3|wav|ogg)$/i)
      ) {
        categories.media.bytes += bytes;
        categories.media.count += 1;
      } else if (
        mime.includes('zip') ||
        mime.includes('tar') ||
        mime.includes('gzip') ||
        mime.includes('rar') ||
        name.match(/\.(zip|tar|gz|rar|7z)$/i)
      ) {
        categories.archives.bytes += bytes;
        categories.archives.count += 1;
      } else {
        categories.others.bytes += bytes;
        categories.others.count += 1;
      }
    }

    const quotaBytes = req.user.quotaBytes || FIFTEEN_GB;
    const activeUsedBytes =
      categories.documents.bytes +
      categories.images.bytes +
      categories.media.bytes +
      categories.archives.bytes +
      categories.others.bytes;

    const totalUsedBytes = activeUsedBytes + categories.trash.bytes;
    const percentUsed = Math.min(100, (totalUsedBytes / quotaBytes) * 100);

    res.json({
      success: true,
      analytics: {
        totalUsedBytes,
        activeUsedBytes,
        quotaBytes,
        percentUsed: Number(percentUsed.toFixed(1)),
        freeBytes: Math.max(0, quotaBytes - totalUsedBytes),
        totalFileCount: allFiles.length,
        categories,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
