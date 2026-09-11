const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { Readable } = require('stream');
const { v4: uuidv4 } = require('uuid');
const { bucket, isFirebaseInitialized } = require('../config/firebase');
const config = require('../config');

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

// Ensure local uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
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
 * Upload a file with AES-256-GCM encryption at rest
 */
async function uploadFile({ buffer, originalname, mimetype, size, userId }) {
  const sanitizedName = originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
  const uniqueKey = `${uuidv4()}_${sanitizedName}.enc`;

  // Encrypt file buffer before writing to cloud or disk
  const encryptedBuffer = encryptBuffer(buffer, userId);

  // Try Firebase Storage first if initialized
  if (isFirebaseInitialized && bucket) {
    try {
      const cloudPath = `users/${userId}/${uniqueKey}`;
      const cloudFile = bucket.file(cloudPath);

      await cloudFile.save(encryptedBuffer, {
        metadata: {
          contentType: 'application/octet-stream',
          metadata: {
            originalName: originalname,
            uploadedBy: userId,
            encrypted: 'AES-256-GCM',
          },
        },
        resumable: false,
      });

      console.log(`🔒 [AES-256-GCM] Encrypted & uploaded to Firebase: ${cloudPath}`);
      return {
        storageProvider: 'firebase',
        path: cloudPath,
      };
    } catch (firebaseErr) {
      console.warn(
        `⚠️ Firebase upload failed (${firebaseErr.message}). Falling back to local encrypted storage.`
      );
    }
  }

  // Local filesystem encrypted storage fallback
  const userUploadDir = path.join(UPLOADS_DIR, userId);
  if (!fs.existsSync(userUploadDir)) {
    fs.mkdirSync(userUploadDir, { recursive: true });
  }

  const localFilePath = path.join(userUploadDir, uniqueKey);
  fs.writeFileSync(localFilePath, encryptedBuffer);

  const relativePath = path.join('uploads', userId, uniqueKey).replace(/\\/g, '/');
  console.log(`🔒 [AES-256-GCM] Encrypted & stored locally: ${relativePath}`);

  return {
    storageProvider: 'local',
    path: relativePath,
  };
}

/**
 * Get decrypted download stream for a file
 */
async function getFileDownloadStream(fileDoc) {
  const ownerId = fileDoc.owner ? fileDoc.owner.toString() : '';

  if (fileDoc.storageProvider === 'firebase' && bucket) {
    const cloudFile = bucket.file(fileDoc.firebasePath);
    const [exists] = await cloudFile.exists();
    if (!exists) {
      throw new Error('File not found in cloud storage.');
    }

    const [encryptedBuffer] = await cloudFile.download();
    const decryptedBuffer = decryptBuffer(encryptedBuffer, ownerId);
    const stream = Readable.from(decryptedBuffer);

    return {
      stream,
      size: decryptedBuffer.length,
      mimeType: fileDoc.mimeType,
      filename: fileDoc.name,
    };
  }

  // Local storage
  const fullPath = path.resolve(__dirname, '../../', fileDoc.firebasePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error('File not found on server storage.');
  }

  const encryptedBuffer = fs.readFileSync(fullPath);
  const decryptedBuffer = decryptBuffer(encryptedBuffer, ownerId);
  const stream = Readable.from(decryptedBuffer);

  return {
    stream,
    size: decryptedBuffer.length,
    mimeType: fileDoc.mimeType,
    filename: fileDoc.name,
  };
}

/**
 * Delete a stored file from storage
 */
async function deleteStoredFile(fileDoc) {
  if (fileDoc.storageProvider === 'firebase' && bucket) {
    try {
      const cloudFile = bucket.file(fileDoc.firebasePath);
      const [exists] = await cloudFile.exists();
      if (exists) {
        await cloudFile.delete();
        console.log(`☁️ Deleted from Firebase: ${fileDoc.firebasePath}`);
      }
    } catch (err) {
      console.warn(`⚠️ Failed to delete Firebase object: ${err.message}`);
    }
    return;
  }

  // Local storage
  try {
    const fullPath = path.resolve(__dirname, '../../', fileDoc.firebasePath);
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
};
