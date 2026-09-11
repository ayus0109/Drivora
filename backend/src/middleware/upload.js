const multer = require('multer');

// Memory storage keeps file buffers in memory for direct cloud upload
const storage = multer.memoryStorage();

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB max file size

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

module.exports = {
  upload,
  MAX_FILE_SIZE,
};
