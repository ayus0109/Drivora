const express = require('express');
const ActivityLog = require('../models/ActivityLog');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

/**
 * GET /api/activity
 * Get recent activity audit logs
 */
router.get('/', async (req, res, next) => {
  try {
    const logs = await ActivityLog.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      logs,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
