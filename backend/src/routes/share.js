const express = require('express');
const crypto = require('crypto');
const ShareLink = require('../models/ShareLink');
const File = require('../models/File');
const { authenticate } = require('../middleware/auth');
const storageService = require('../services/storageService');

const router = express.Router();

/**
 * =======================================================
 * PROTECTED ROUTES (Require Login)
 * =======================================================
 */

/**
 * POST /api/share/:fileId
 * Generate or retrieve a view-only share link for a file
 */
router.post('/:fileId', authenticate, async (req, res, next) => {
  try {
    const file = await File.findOne({
      _id: req.params.fileId,
      owner: req.userId,
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found or access denied.',
      });
    }

    // Check if an active share link already exists
    let shareLink = await ShareLink.findOne({
      file: file._id,
      owner: req.userId,
      isActive: true,
    });

    if (!shareLink) {
      // Generate a secure 32-character token
      const token = crypto.randomBytes(16).toString('hex');
      shareLink = await ShareLink.create({
        file: file._id,
        owner: req.userId,
        token,
        isActive: true,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Share link generated successfully.',
      shareLink: {
        id: shareLink._id,
        token: shareLink.token,
        isActive: shareLink.isActive,
        views: shareLink.views,
        downloads: shareLink.downloads,
        createdAt: shareLink.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/share/file/:fileId
 * Check share status of a file
 */
router.get('/file/:fileId', authenticate, async (req, res, next) => {
  try {
    const shareLink = await ShareLink.findOne({
      file: req.params.fileId,
      owner: req.userId,
      isActive: true,
    });

    res.json({
      success: true,
      isShared: !!shareLink,
      shareLink: shareLink
        ? {
            id: shareLink._id,
            token: shareLink.token,
            views: shareLink.views,
            downloads: shareLink.downloads,
            createdAt: shareLink.createdAt,
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/share/:token
 * Revoke an active share link
 */
router.delete('/:token', authenticate, async (req, res, next) => {
  try {
    const shareLink = await ShareLink.findOne({
      token: req.params.token,
      owner: req.userId,
    });

    if (!shareLink) {
      return res.status(404).json({
        success: false,
        message: 'Share link not found or access denied.',
      });
    }

    shareLink.isActive = false;
    await shareLink.save();

    res.json({
      success: true,
      message: 'Share link revoked successfully.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * =======================================================
 * PUBLIC ROUTES (No Login Required - Anyone with Link)
 * =======================================================
 */

/**
 * GET /api/share/:token
 * Get shared file metadata (View-only, Public)
 */
router.get('/:token', async (req, res, next) => {
  try {
    const shareLink = await ShareLink.findOne({
      token: req.params.token,
      isActive: true,
    })
      .populate('file', 'name sizeBytes mimeType createdAt')
      .populate('owner', 'email');

    if (!shareLink || !shareLink.file) {
      return res.status(404).json({
        success: false,
        message: 'This share link is invalid, expired, or has been revoked.',
      });
    }

    // Increment view count
    shareLink.views += 1;
    await shareLink.save();

    res.json({
      success: true,
      file: {
        id: shareLink.file._id,
        name: shareLink.file.name,
        sizeBytes: shareLink.file.sizeBytes,
        mimeType: shareLink.file.mimeType,
        createdAt: shareLink.file.createdAt,
        sharedBy: shareLink.owner ? shareLink.owner.email : 'Anonymous',
        token: shareLink.token,
        views: shareLink.views,
        downloads: shareLink.downloads,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/share/:token/download
 * Public download of shared file without authentication
 */
router.get('/:token/download', async (req, res, next) => {
  try {
    const shareLink = await ShareLink.findOne({
      token: req.params.token,
      isActive: true,
    }).populate('file');

    if (!shareLink || !shareLink.file) {
      return res.status(404).json({
        success: false,
        message: 'This share link is invalid, expired, or has been revoked.',
      });
    }

    // Increment download count
    shareLink.downloads += 1;
    await shareLink.save();

    const { stream, buffer, size, mimeType, filename } =
      await storageService.getFileDownloadStream(shareLink.file);

    const isInline = req.query.inline === 'true' || req.query.preview === 'true';
    const dispositionType = isInline ? 'inline' : 'attachment';

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader(
      'Cache-Control',
      isInline ? 'public, max-age=86400, immutable' : 'no-cache'
    );
    res.setHeader(
      'Content-Disposition',
      `${dispositionType}; filename="${encodeURIComponent(filename)}"`
    );

    const rangeHeader = req.headers.range;
    if (rangeHeader && buffer) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : size - 1;

      if (start >= size || end >= size || start > end) {
        res.setHeader('Content-Range', `bytes */${size}`);
        return res.status(416).end();
      }

      const chunkSize = end - start + 1;
      const slicedBuffer = buffer.subarray(start, end + 1);

      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
      res.setHeader('Content-Length', chunkSize);
      res.setHeader('Content-Type', mimeType);

      return res.end(slicedBuffer);
    }

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', size);

    stream.on('error', (streamErr) => {
      console.error('Shared download stream error:', streamErr);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error streaming shared file.',
        });
      }
    });

    stream.pipe(res);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
