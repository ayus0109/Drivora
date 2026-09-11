const path = require('path');
const fs = require('fs');

// Attempt loading .env from multiple candidate paths
const candidateEnvPaths = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'backend/.env'),
];

for (const envPath of candidateEnvPaths) {
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
  }
}
// Default fallback load
require('dotenv').config();

// Production MongoDB Atlas fallback to ensure the server never crashes on startup
const DEFAULT_MONGO_URI =
  'mongodb+srv://ayushphalak5_db_user:pw3RvviiNWk55UEQ@cluster0.70w48dw.mongodb.net/mini_google_drive?retryWrites=true&w=majority&appName=Cluster0';

module.exports = {
  port: parseInt(process.env.PORT, 10) || 5000,
  mongoUri: process.env.MONGODB_URI || DEFAULT_MONGO_URI,
  jwtSecret: process.env.JWT_SECRET || 'mini_google_drive_super_secure_jwt_secret_key_2026_x7a89b',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  firebaseConfig: {
    projectId: process.env.FIREBASE_PROJECT_ID || 'storage-system-gd',
    clientEmail:
      process.env.FIREBASE_CLIENT_EMAIL ||
      'firebase-adminsdk-fbsvc@storage-system-gd.iam.gserviceaccount.com',
    privateKey: process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'storage-system-gd.firebasestorage.app',
  },
};
