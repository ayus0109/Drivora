const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { Readable } = require('stream');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const { bucket: firebaseBucket, isFirebaseInitialized } = require('../config/firebase');
const config = require('../config');

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

// Ensure local uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

let gridFSBucketInstance = null;

/**
 * Get or initialize MongoDB Atlas GridFSBucket for portable encrypted cloud storage
 */
function getGridFSBucket() {
  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    throw new Error('Database connection is not ready for cloud storage operations.');
  }
  if (!gridFSBucketInstance || gridFSBucketInstance.s.db !== mongoose.connection.db) {
    const GridFSBucket = mongoose.mongo.GridFSBucket;
    gridFSBucketInstance = new GridFSBucket(mongoose.connection.db, {
      bucketName: 'encrypted_vault',
    });
  }
  return gridFSBucketInstance;
}

/**
 * Derive per-user 256-bit encryption key using Scrypt KDF
 */
function getEncryptionKey(userId) {
  const secret = config.jwtSecret || 'mini_google_drive_secure_key_2026';
  return crypto.scryptSync(secret, userId.toString(), 32);
}

/**
 * Encrypt a buffer with AES-256-GCM
 * Output format: [12-byte IV][16-byte AuthTag][Ciphertext]
 */
function encryptBuffer(buffer, userId) {
  const key = getEncryptionKey(userId);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]);
}

/**
 * Decrypt an encrypted buffer with AES-256-GCM
 */
function decryptBuffer(encryptedBuffer, userId) {
  // If not encrypted (e.g. legacy plain file), return buffer directly
  if (encryptedBuffer.length < 28) return encryptedBuffer;

  try {
    const key = getEncryptionKey(userId);
    const iv = encryptedBuffer.subarray(0, 12);
    const tag = encryptedBuffer.subarray(12, 28);
    const ciphertext = encryptedBuffer.subarray(28);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch (err) {
    // If decryption fails (e.g. legacy unencrypted file), return original buffer
    return encryptedBuffer;
  }
}

/**
 * Upload a file with AES-256-GCM encryption at rest.
 * Stores primarily into MongoDB Atlas Cloud GridFS so files are 100% portable across any PC/device.
 */
async function uploadFile({ buffer, originalname, mimetype, size, userId }) {
  const sanitizedName = originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
  const uniqueKey = `${uuidv4()}_${sanitizedName}.enc`;

  // Encrypt file buffer before storing
  const encryptedBuffer = encryptBuffer(buffer, userId);

  try {
    // Primary: Store directly in MongoDB Atlas Cloud GridFS
    const gfsBucket = getGridFSBucket();
    const uploadStream = gfsBucket.openUploadStream(uniqueKey, {
      metadata: {
        originalname,
        mimetype,
        userId: userId.toString(),
        encrypted: 'AES-256-GCM',
        sizeBytes: size,
        uploadedAt: new Date(),
      },
    });

    await new Promise((resolve, reject) => {
      Readable.from(encryptedBuffer)
        .pipe(uploadStream)
        .on('finish', resolve)
        .on('error', reject);
    });

    const gridfsId = uploadStream.id;
    console.log(`🔒 [AES-256-GCM] Encrypted & stored in MongoDB Atlas Cloud GridFS: ${uniqueKey} (ID: ${gridfsId})`);

    // Keep optional local cache on this machine
    try {
      const userUploadDir = path.join(UPLOADS_DIR, userId.toString());
      if (!fs.existsSync(userUploadDir)) fs.mkdirSync(userUploadDir, { recursive: true });
      fs.writeFileSync(path.join(userUploadDir, uniqueKey), encryptedBuffer);
    } catch (e) {
      // Local cache failure is non-fatal
    }

    return {
      storageProvider: 'gridfs',
      gridfsId,
      path: `gridfs://${uniqueKey}`,
    };
  } catch (cloudErr) {
    console.warn(`⚠️ Cloud GridFS upload failed (${cloudErr.message}). Falling back to local storage.`);

    // Local filesystem fallback
    const userUploadDir = path.join(UPLOADS_DIR, userId.toString());
    if (!fs.existsSync(userUploadDir)) {
      fs.mkdirSync(userUploadDir, { recursive: true });
    }

    const localFilePath = path.join(userUploadDir, uniqueKey);
    fs.writeFileSync(localFilePath, encryptedBuffer);

    const relativePath = path.join('uploads', userId.toString(), uniqueKey).replace(/\\/g, '/');
    console.log(`🔒 [AES-256-GCM] Encrypted & stored locally: ${relativePath}`);

    return {
      storageProvider: 'local',
      gridfsId: null,
      path: relativePath,
    };
  }
}

/**
 * Get decrypted download stream for a file.
 * Handles GridFS cloud storage, Firebase, and legacy local storage with auto-migration to cloud.
 */
async function getFileDownloadStream(fileDoc) {
  const ownerId = fileDoc.owner ? fileDoc.owner.toString() : '';

  // 1. Cloud GridFS Storage (Primary)
  if (fileDoc.storageProvider === 'gridfs' || fileDoc.gridfsId) {
    try {
      const gfsBucket = getGridFSBucket();
      const gridId =
        fileDoc.gridfsId instanceof mongoose.Types.ObjectId
          ? fileDoc.gridfsId
          : new mongoose.Types.ObjectId(fileDoc.gridfsId);

      const downloadStream = gfsBucket.openDownloadStream(gridId);
      const chunks = [];
      for await (const chunk of downloadStream) {
        chunks.push(chunk);
      }
      const encryptedBuffer = Buffer.concat(chunks);
      const decryptedBuffer = decryptBuffer(encryptedBuffer, ownerId);
      const stream = Readable.from(decryptedBuffer);

      return {
        stream,
        buffer: decryptedBuffer,
        size: decryptedBuffer.length,
        mimeType: fileDoc.mimeType,
        filename: fileDoc.name,
      };
    } catch (gridErr) {
      console.warn(`⚠️ GridFS fetch error for ${fileDoc.name} (${gridErr.message}), checking fallbacks...`);
    }
  }

  // 2. Firebase Storage (if available)
  if (fileDoc.storageProvider === 'firebase' && isFirebaseInitialized && firebaseBucket) {
    try {
      const cloudFile = firebaseBucket.file(fileDoc.firebasePath);
      const [exists] = await cloudFile.exists();
      if (exists) {
        const [encryptedBuffer] = await cloudFile.download();
        const decryptedBuffer = decryptBuffer(encryptedBuffer, ownerId);
        const stream = Readable.from(decryptedBuffer);

        return {
          stream,
          buffer: decryptedBuffer,
          size: decryptedBuffer.length,
          mimeType: fileDoc.mimeType,
          filename: fileDoc.name,
        };
      }
    } catch (fbErr) {
      console.warn(`⚠️ Firebase download error: ${fbErr.message}`);
    }
  }

  // 3. Local filesystem storage (Legacy)
  const fullPath = path.resolve(__dirname, '../../', fileDoc.firebasePath || '');
  if (fs.existsSync(fullPath)) {
    const encryptedBuffer = fs.readFileSync(fullPath);
    const decryptedBuffer = decryptBuffer(encryptedBuffer, ownerId);
    const stream = Readable.from(decryptedBuffer);

    // Auto-migrate local file to GridFS in the background so it becomes portable across all PCs
    migrateLocalFileToGridFS(fileDoc, encryptedBuffer).catch((err) =>
      console.warn(`Background migration to GridFS failed:`, err.message)
    );

    return {
      stream,
      buffer: decryptedBuffer,
      size: decryptedBuffer.length,
      mimeType: fileDoc.mimeType,
      filename: fileDoc.name,
    };
  }

  throw new Error('File not found in cloud storage or local storage.');
}

/**
 * Migrate a local file buffer into MongoDB Atlas GridFS and update document.
 */
async function migrateLocalFileToGridFS(fileDoc, encryptedBuffer) {
  try {
    const File = require('../models/File');
    const gfsBucket = getGridFSBucket();
    const sanitizedName = fileDoc.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueKey = `${uuidv4()}_${sanitizedName}.enc`;

    const uploadStream = gfsBucket.openUploadStream(uniqueKey, {
      metadata: {
        originalname: fileDoc.name,
        mimetype: fileDoc.mimeType,
        userId: fileDoc.owner ? fileDoc.owner.toString() : '',
        encrypted: 'AES-256-GCM',
        sizeBytes: fileDoc.sizeBytes,
        migratedAt: new Date(),
      },
    });

    await new Promise((resolve, reject) => {
      Readable.from(encryptedBuffer)
        .pipe(uploadStream)
        .on('finish', resolve)
        .on('error', reject);
    });

    await File.findByIdAndUpdate(fileDoc._id, {
      storageProvider: 'gridfs',
      gridfsId: uploadStream.id,
      firebasePath: `gridfs://${uniqueKey}`,
    });

    console.log(`☁️ [MIGRATED] File "${fileDoc.name}" uploaded to MongoDB Atlas GridFS!`);
  } catch (err) {
    console.warn(`Migration error for ${fileDoc.name}:`, err.message);
  }
}

/**
 * Delete a stored file from storage (GridFS, Firebase, Local)
 */
async function deleteStoredFile(fileDoc) {
  // 1. Delete from GridFS
  if (fileDoc.gridfsId) {
    try {
      const gfsBucket = getGridFSBucket();
      const gridId =
        fileDoc.gridfsId instanceof mongoose.Types.ObjectId
          ? fileDoc.gridfsId
          : new mongoose.Types.ObjectId(fileDoc.gridfsId);
      await gfsBucket.delete(gridId);
      console.log(`☁️ Deleted from MongoDB Atlas GridFS: ${fileDoc.gridfsId}`);
    } catch (err) {
      console.warn(`⚠️ Failed to delete GridFS file: ${err.message}`);
    }
  }

  // 2. Delete from Firebase
  if (fileDoc.storageProvider === 'firebase' && isFirebaseInitialized && firebaseBucket) {
    try {
      const cloudFile = firebaseBucket.file(fileDoc.firebasePath);
      const [exists] = await cloudFile.exists();
      if (exists) {
        await cloudFile.delete();
        console.log(`☁️ Deleted from Firebase: ${fileDoc.firebasePath}`);
      }
    } catch (err) {
      console.warn(`⚠️ Failed to delete Firebase object: ${err.message}`);
    }
  }

  // 3. Delete from Local
  try {
    const fullPath = path.resolve(__dirname, '../../', fileDoc.firebasePath || '');
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`💾 Deleted local file: ${fullPath}`);
    }
  } catch (err) {
    console.warn(`⚠️ Failed to delete local file: ${err.message}`);
  }
}

module.exports = {
  uploadFile,
  getFileDownloadStream,
  deleteStoredFile,
  migrateLocalFileToGridFS,
  getGridFSBucket,
};
