const mongoose = require('mongoose');
const config = require('../config');
const User = require('../models/User');

const FIFTEEN_GB = 15 * 1024 * 1024 * 1024; // 16,106,127,360 bytes

async function migrate() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(config.mongoUri);
    console.log('Connected to MongoDB.');

    const result = await User.updateMany(
      {},
      {
        $set: { quotaBytes: FIFTEEN_GB },
      }
    );

    console.log(
      `Migration completed successfully: Matched ${result.matchedCount} users, modified ${result.modifiedCount} users to 15 GB (${FIFTEEN_GB} bytes).`
    );

    const users = await User.find({}, 'email name quotaBytes usedStorageBytes authProvider');
    console.log('\n--- Current Registered Users ---');
    users.forEach((u) => {
      console.log(
        `User: ${u.email} | Provider: ${u.authProvider || 'local'} | Quota: ${(
          u.quotaBytes /
          (1024 * 1024 * 1024)
        ).toFixed(1)} GB (${u.quotaBytes} bytes) | Used: ${(
          u.usedStorageBytes /
          (1024 * 1024)
        ).toFixed(2)} MB`
      );
    });

    await mongoose.disconnect();
    console.log('Disconnected from database.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
