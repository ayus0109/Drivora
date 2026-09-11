const express = require('express');
const File = require('../models/File');
const Folder = require('../models/Folder');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { authenticate } = require('../middleware/auth');
const { upload, MAX_FILE_SIZE } = require('../middleware/upload');
const storageService = require('../services/storageService');

const router = express.Router();

// Apply auth to all file routes
router.use(authenticate);

/**
 * POST /api/files/upload
 * Upload a file (multipart/form-data)
 * Fields: 'file' (binary), optional 'folderId' (string)
 */
router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided for upload.',
      });
    }

    const { folderId } = req.body;
    let folder = null;

    if (folderId && folderId !== 'root' && folderId !== 'null') {
      const parentFolder = await Folder.findOne({
        _id: folderId,
        owner: req.userId,
      });

      if (!parentFolder) {
        return res.status(404).json({
          success: false,
          message: 'Target folder not found.',
        });
      }
      folder = parentFolder._id;
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const fileSize = req.file.size;
    const availableQuota = user.quotaBytes - user.usedStorageBytes;

    // Strict storage quota check
    if (user.usedStorageBytes + fileSize > user.quotaBytes) {
      return res.status(413).json({
        success: false,
        message: `Storage quota exceeded. Available: ${(availableQuota / (1024 * 1024)).toFixed(2)} MB, Required: ${(fileSize / (1024 * 1024)).toFixed(2)} MB`,
        availableBytes: availableQuota,
        requiredBytes: fileSize,
      });
    }

    // Google Drive standard: If a file with the same name exists in this folder,
    // automatically generate a distinct version name like "file (1).pdf" instead of throwing 409
    let finalFileName = req.file.originalname;
    let counter = 1;
    while (await File.findOne({ owner: req.userId, folder, name: finalFileName })) {
      const lastDot = req.file.originalname.lastIndexOf('.');
      if (lastDot !== -1) {
        const base = req.file.originalname.substring(0, lastDot);
        const ext = req.file.originalname.substring(lastDot);
        finalFileName = `${base} (${counter})${ext}`;
      } else {
        finalFileName = `${req.file.originalname} (${counter})`;
      }
      counter++;
    }

    // Upload to storage provider (Firebase or local fallback)
    const uploadResult = await storageService.uploadFile({
      buffer: req.file.buffer,
      originalname: finalFileName,
      mimetype: req.file.mimetype || 'application/octet-stream',
      size: fileSize,
      userId: req.userId,
    });

    // Create file record in database
    const fileDoc = await File.create({
      name: finalFileName,
      owner: req.userId,
      folder,
      mimeType: req.file.mimetype || 'application/octet-stream',
      sizeBytes: fileSize,
      firebasePath: uploadResult.path,
      storageProvider: uploadResult.storageProvider,
    });

    // Atomically increment user usedStorageBytes
    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { $inc: { usedStorageBytes: fileSize } },
      { new: true }
    );

    // Record Activity Log
    await ActivityLog.create({
      user: req.userId,
      action: 'UPLOAD_FILE',
      targetName: req.file.originalname,
      details: `${(fileSize / 1024).toFixed(1)} KB (AES-256-GCM Encrypted)`,
    }).catch((err) => console.warn('Activity log error:', err.message));

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully.',
      file: fileDoc,
      storage: {
        usedStorageBytes: updatedUser.usedStorageBytes,
        quotaBytes: updatedUser.quotaBytes,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/files/:id/download
 * Download a file with proper Content-Disposition and streaming
 */
router.get('/:id/download', async (req, res, next) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      owner: req.userId,
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found.',
      });
    }

    const { stream, size, mimeType, filename } =
      await storageService.getFileDownloadStream(file);

    const isInline = req.query.inline === 'true' || req.query.preview === 'true';
    const dispositionType = isInline ? 'inline' : 'attachment';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', size);
    res.setHeader(
      'Content-Disposition',
      `${dispositionType}; filename="${encodeURIComponent(filename)}"`
    );

    stream.on('error', (streamErr) => {
      console.error('Download stream error:', streamErr);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error streaming file.',
        });
      }
    });

    stream.pipe(res);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/files
 * List files with search, sort, and folder filtering
 */
router.get('/', async (req, res, next) => {
  try {
    const { folder, search, sort = 'createdAt', order = 'desc' } = req.query;

    const query = { owner: req.userId };

    if (search && search.trim()) {
      query.name = { $regex: search.trim(), $options: 'i' };
    }

    if (folder !== undefined && folder !== '') {
      if (folder === 'root' || folder === 'null') {
        query.folder = null;
      } else {
        query.folder = folder;
      }
    } else if (!search) {
      query.folder = null;
    }

    const sortField = ['name', 'createdAt', 'sizeBytes'].includes(sort)
      ? sort
      : 'createdAt';
    const sortOrder = order === 'asc' ? 1 : -1;

    const files = await File.find(query).sort({ [sortField]: sortOrder });

    res.json({
      success: true,
      count: files.length,
      files,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/files/:id
 * Get single file metadata
 */
router.get('/:id', async (req, res, next) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      owner: req.userId,
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found.',
      });
    }

    res.json({
      success: true,
      file,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/files/:id
 * Rename a file
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'New file name is required.',
      });
    }

    const trimmedName = name.trim();
    const file = await File.findOne({
      _id: req.params.id,
      owner: req.userId,
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found.',
      });
    }

    const duplicate = await File.findOne({
      _id: { $ne: file._id },
      owner: req.userId,
      folder: file.folder,
      name: trimmedName,
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: 'A file with this name already exists in this folder.',
      });
    }

    file.name = trimmedName;
    await file.save();

    res.json({
      success: true,
      message: 'File renamed successfully.',
      file,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/files/:id
 * Delete file from storage + database + reclaim quota
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      owner: req.userId,
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found.',
      });
    }

    // Delete from storage (cloud or local)
    await storageService.deleteStoredFile(file);

    // Reclaim storage quota (clamped to 0)
    let updatedUser = null;
    if (file.sizeBytes > 0) {
      const user = await User.findById(req.userId);
      if (user) {
        user.usedStorageBytes = Math.max(0, user.usedStorageBytes - file.sizeBytes);
        await user.save();
        updatedUser = user;
      }
    } else {
      updatedUser = await User.findById(req.userId);
    }

    await File.deleteOne({ _id: file._id });

    res.json({
      success: true,
      message: 'File deleted successfully.',
      reclaimedBytes: file.sizeBytes,
      storage: updatedUser
        ? {
            usedStorageBytes: updatedUser.usedStorageBytes,
            quotaBytes: updatedUser.quotaBytes,
          }
        : undefined,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
