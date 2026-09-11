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
    isTrash: {
      type: Boolean,
      default: false,
      index: true,
    },
    trashedAt: {
      type: Date,
      default: null,
    },
    isStarred: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for high-performance querying
fileSchema.index({ owner: 1, isTrash: 1, folder: 1 });
fileSchema.index({ owner: 1, isStarred: 1 });
fileSchema.index({ owner: 1, name: 1 });

module.exports = mongoose.model('File', fileSchema);
