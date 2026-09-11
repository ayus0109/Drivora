const admin = require('firebase-admin');
const config = require('./index');

let bucket = null;
let isFirebaseInitialized = false;

try {
  if (
    config.firebaseConfig.projectId &&
    config.firebaseConfig.clientEmail &&
    config.firebaseConfig.privateKey
  ) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.firebaseConfig.projectId,
        clientEmail: config.firebaseConfig.clientEmail,
        privateKey: config.firebaseConfig.privateKey,
      }),
      storageBucket:
        config.firebaseConfig.storageBucket ||
        `${config.firebaseConfig.projectId}.appspot.com`,
    });

    bucket = admin.storage().bucket();
    isFirebaseInitialized = true;
    console.log('✅ Firebase Admin SDK initialized successfully');
  } else {
    console.warn(
      '⚠️ Firebase credentials incomplete in .env. Storage will use local fallback.'
    );
  }
} catch (err) {
  console.warn('⚠️ Firebase Admin initialization error:', err.message);
}

module.exports = {
  admin,
  bucket,
  isFirebaseInitialized,
};
