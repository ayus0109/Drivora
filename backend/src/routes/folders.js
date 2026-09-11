const express = require('express');
const Folder = require('../models/Folder');
const File = require('../models/File');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const storageService = require('../services/storageService');

const router = express.Router();

// Apply auth to all folder routes
router.use(authenticate);

/**
 * Helper to recursively find all descendant folder IDs of a folder
 */
async function getAllDescendantFolderIds(userId, folderId) {
  const descendantIds = [folderId];
  let currentParentIds = [folderId];

  while (currentParentIds.length > 0) {
    const children = await Folder.find({
      owner: userId,
      parent: { $in: currentParentIds },
    }).select('_id');

    if (children.length === 0) break;

    const childIds = children.map((c) => c._id);
    descendantIds.push(...childIds);
    currentParentIds = childIds;
  }

  return descendantIds;
}

/**
 * POST /api/folders
 * Create a new folder
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, parentId } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Folder name is required.',
      });
    }

    const trimmedName = name.trim();
    let parent = null;

    if (parentId && parentId !== 'root') {
      const parentFolder = await Folder.findOne({
        _id: parentId,
        owner: req.userId,
      });

      if (!parentFolder) {
        return res.status(404).json({
          success: false,
          message: 'Parent folder not found.',
        });
      }
      parent = parentFolder._id;
    }

    // Check for duplicate folder name under the same parent
    const existing = await Folder.findOne({
      owner: req.userId,
      parent,
      name: trimmedName,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A folder with this name already exists in this directory.',
      });
    }

    const folder = await Folder.create({
      name: trimmedName,
      owner: req.userId,
      parent,
    });

    res.status(201).json({
      success: true,
      message: 'Folder created successfully.',
      folder,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/folders
 * List folders inside a parent (or root if parent not provided or 'root')
 */
router.get('/', async (req, res, next) => {
  try {
    const { parent } = req.query;
    let parentQuery = null;

    if (parent && parent !== 'root' && parent !== 'null') {
      parentQuery = parent;
    }

    const folders = await Folder.find({
      owner: req.userId,
      parent: parentQuery,
    }).sort({ name: 1 });

    res.json({
      success: true,
      folders,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/folders/:id/path
 * Get breadcrumb path from root to this folder
 */
router.get('/:id/path', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || id === 'root') {
      return res.json({
        success: true,
        path: [{ _id: null, name: 'My Drive' }],
      });
    }

    const path = [];
    let currentId = id;

    while (currentId) {
      const folder = await Folder.findOne({
        _id: currentId,
        owner: req.userId,
      }).select('_id name parent');

      if (!folder) break;

      path.unshift({
        _id: folder._id,
        name: folder.name,
      });

      currentId = folder.parent;
    }

    // Prepend root entry
    path.unshift({ _id: null, name: 'My Drive' });

    res.json({
      success: true,
      path,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/folders/:id
 * Get folder metadata
 */
router.get('/:id', async (req, res, next) => {
  try {
    const folder = await Folder.findOne({
      _id: req.params.id,
      owner: req.userId,
    });

    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found.',
      });
    }

    res.json({
      success: true,
      folder,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/folders/:id
 * Rename a folder
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'New folder name is required.',
      });
    }

    const trimmedName = name.trim();
    const folder = await Folder.findOne({
      _id: req.params.id,
      owner: req.userId,
    });

    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found.',
      });
    }

    // Check duplicate name in same parent
    const duplicate = await Folder.findOne({
      _id: { $ne: folder._id },
      owner: req.userId,
      parent: folder.parent,
      name: trimmedName,
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: 'A folder with this name already exists in this directory.',
      });
    }

    folder.name = trimmedName;
    await folder.save();

    res.json({
      success: true,
      message: 'Folder renamed successfully.',
      folder,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/folders/:id
 * Recursive deletion: folder, all nested folders, all nested files, reclaim quota
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const folder = await Folder.findOne({
      _id: req.params.id,
      owner: req.userId,
    });

    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found.',
      });
    }

    // Collect all descendant folder IDs including this folder
    const allFolderIds = await getAllDescendantFolderIds(req.userId, folder._id);

    // Find all files in all these folders
    const filesToDelete = await File.find({
      owner: req.userId,
      folder: { $in: allFolderIds },
    });

    // Sum storage bytes to reclaim
    const reclaimedBytes = filesToDelete.reduce(
      (sum, f) => sum + (f.sizeBytes || 0),
      0
    );

    // Delete physical files from storage (Firebase / Local)
    for (const file of filesToDelete) {
      await storageService.deleteStoredFile(file);
    }

    // Delete files from DB
    await File.deleteMany({
      owner: req.userId,
      folder: { $in: allFolderIds },
    });

    // Reclaim storage quota on User document (clamped to 0)
    let updatedUser = null;
    if (reclaimedBytes > 0) {
      const user = await User.findById(req.userId);
      if (user) {
        user.usedStorageBytes = Math.max(0, user.usedStorageBytes - reclaimedBytes);
        await user.save();
        updatedUser = user;
      }
    } else {
      updatedUser = await User.findById(req.userId);
    }

    // Delete all descendant folders + root folder
    const deleteResult = await Folder.deleteMany({
      _id: { $in: allFolderIds },
      owner: req.userId,
    });

    res.json({
      success: true,
      message: `Folder and its contents deleted successfully.`,
      deletedFolderCount: deleteResult.deletedCount,
      deletedFileCount: filesToDelete.length,
      reclaimedBytes,
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
