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
        isTrash: false,
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
      isTrash: false,
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
 * List folders inside a parent, or by trash/starred/all
 */
router.get('/', async (req, res, next) => {
  try {
    const { parent, trash, starred, all, search } = req.query;
    const query = { owner: req.userId };

    if (trash === 'true') {
      query.isTrash = true;
    } else {
      query.isTrash = false;

      if (starred === 'true') {
        query.isStarred = true;
      } else if (all === 'true') {
        // Return all user folders (for move-to modal directory tree)
      } else {
        let parentQuery = null;
        if (parent && parent !== 'root' && parent !== 'null') {
          parentQuery = parent;
        }
        query.parent = parentQuery;
      }
    }

    if (search && search.trim()) {
      query.name = { $regex: search.trim(), $options: 'i' };
    }

    const folders = await Folder.find(query).sort({ name: 1 });

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
 * PATCH /api/folders/:id/star
 * Toggle Starred status
 */
router.patch('/:id/star', async (req, res, next) => {
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

    folder.isStarred = !folder.isStarred;
    await folder.save();

    res.json({
      success: true,
      message: folder.isStarred ? 'Starred folder' : 'Removed from Starred',
      isStarred: folder.isStarred,
      folder,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/folders/:id/trash
 * Soft delete folder and cascade to all nested folders & files
 */
router.patch('/:id/trash', async (req, res, next) => {
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

    const allFolderIds = await getAllDescendantFolderIds(req.userId, folder._id);

    await Folder.updateMany(
      { _id: { $in: allFolderIds }, owner: req.userId },
      { $set: { isTrash: true, trashedAt: new Date() } }
    );

    await File.updateMany(
      { folder: { $in: allFolderIds }, owner: req.userId },
      { $set: { isTrash: true, trashedAt: new Date() } }
    );

    res.json({
      success: true,
      message: `"${folder.name}" and its contents moved to Trash.`,
      folder,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/folders/:id/restore
 * Restore folder and cascade to all nested folders & files
 */
router.patch('/:id/restore', async (req, res, next) => {
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

    const allFolderIds = await getAllDescendantFolderIds(req.userId, folder._id);

    await Folder.updateMany(
      { _id: { $in: allFolderIds }, owner: req.userId },
      { $set: { isTrash: false, trashedAt: null } }
    );

    await File.updateMany(
      { folder: { $in: allFolderIds }, owner: req.userId },
      { $set: { isTrash: false, trashedAt: null } }
    );

    res.json({
      success: true,
      message: `"${folder.name}" and its contents restored.`,
      folder,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/folders/:id/move
 * Move folder with hierarchy cycle check
 */
router.patch('/:id/move', async (req, res, next) => {
  try {
    const { targetParentId } = req.body;

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

    let newParentId = null;
    if (targetParentId && targetParentId !== 'root' && targetParentId !== 'null') {
      if (targetParentId === folder._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Cannot move a folder into itself.',
        });
      }

      // Check if targetParentId is a descendant of this folder (prevent cycle)
      const descendants = await getAllDescendantFolderIds(req.userId, folder._id);
      if (descendants.some((id) => id.toString() === targetParentId)) {
        return res.status(400).json({
          success: false,
          message: 'Cannot move a folder into one of its subfolders.',
        });
      }

      const targetFolder = await Folder.findOne({
        _id: targetParentId,
        owner: req.userId,
        isTrash: false,
      });

      if (!targetFolder) {
        return res.status(404).json({
          success: false,
          message: 'Target destination folder not found.',
        });
      }
      newParentId = targetFolder._id;
    }

    folder.parent = newParentId;
    await folder.save();

    res.json({
      success: true,
      message: `Folder "${folder.name}" moved successfully.`,
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

    const duplicate = await Folder.findOne({
      _id: { $ne: folder._id },
      owner: req.userId,
      parent: folder.parent,
      isTrash: false,
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
 * DELETE /api/folders/:id/permanent
 * Recursively purge folder, all nested folders, all nested files, reclaim quota
 */
router.delete('/:id/permanent', async (req, res, next) => {
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

    const allFolderIds = await getAllDescendantFolderIds(req.userId, folder._id);

    const filesToDelete = await File.find({
      owner: req.userId,
      folder: { $in: allFolderIds },
    });

    const reclaimedBytes = filesToDelete.reduce(
      (sum, f) => sum + (f.sizeBytes || 0),
      0
    );

    for (const file of filesToDelete) {
      try {
        await storageService.deleteStoredFile(file);
      } catch (err) {}
    }

    await File.deleteMany({
      owner: req.userId,
      folder: { $in: allFolderIds },
    });

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

    const deleteResult = await Folder.deleteMany({
      _id: { $in: allFolderIds },
      owner: req.userId,
    });

    res.json({
      success: true,
      message: `Folder permanently deleted.`,
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

/**
 * DELETE /api/folders/:id
 * Default delete: Soft delete to Trash (or permanent if query permanent=true)
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

    if (req.query.permanent === 'true') {
      const allFolderIds = await getAllDescendantFolderIds(req.userId, folder._id);
      const filesToDelete = await File.find({
        owner: req.userId,
        folder: { $in: allFolderIds },
      });

      const reclaimedBytes = filesToDelete.reduce(
        (sum, f) => sum + (f.sizeBytes || 0),
        0
      );

      for (const file of filesToDelete) {
        try {
          await storageService.deleteStoredFile(file);
        } catch (err) {}
      }

      await File.deleteMany({
        owner: req.userId,
        folder: { $in: allFolderIds },
      });

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

      await Folder.deleteMany({
        _id: { $in: allFolderIds },
        owner: req.userId,
      });

      return res.json({
        success: true,
        message: 'Folder permanently deleted.',
        reclaimedBytes,
        storage: updatedUser
          ? {
              usedStorageBytes: updatedUser.usedStorageBytes,
              quotaBytes: updatedUser.quotaBytes,
            }
          : undefined,
      });
    }

    // Soft delete folder and cascade to children
    const allFolderIds = await getAllDescendantFolderIds(req.userId, folder._id);

    await Folder.updateMany(
      { _id: { $in: allFolderIds }, owner: req.userId },
      { $set: { isTrash: true, trashedAt: new Date() } }
    );

    await File.updateMany(
      { folder: { $in: allFolderIds }, owner: req.userId },
      { $set: { isTrash: true, trashedAt: new Date() } }
    );

    res.json({
      success: true,
      message: `"${folder.name}" moved to Trash.`,
      folder,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
