const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'File name is required'],
      trim: true,
      maxlength: [255, 'File name cannot exceed 255 characters'],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    folder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      default: null,
      index: true,
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
      default: 'application/octet-stream',
    },
    sizeBytes: {
      type: Number,
      required: [true, 'File size in bytes is required'],
      default: 0,
      min: 0,
    },
    firebasePath: {
      type: String,
      default: '',
    },
    storageProvider: {
      type: String,
      enum: ['firebase', 'local'],
      default: 'firebase',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying files inside a folder for a specific user
fileSchema.index({ owner: 1, folder: 1 });
// Text index / compound index for search by filename
fileSchema.index({ owner: 1, name: 1 });

module.exports = mongoose.model('File', fileSchema);
