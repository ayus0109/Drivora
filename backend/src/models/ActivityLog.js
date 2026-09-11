const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'UPLOAD_FILE',
        'CREATE_FOLDER',
        'RENAME_ITEM',
        'DELETE_ITEM',
        'SHARE_FILE',
        'REVOKE_SHARE',
      ],
    },
    targetName: {
      type: String,
      required: true,
    },
    details: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

activityLogSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
