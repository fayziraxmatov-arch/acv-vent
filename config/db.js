const mongoose = require('mongoose');
const dns = require('node:dns');

// Mahalliy DNS SRV so'rovlarni rad etyapti (querySrv ECONNREFUSED) —
// shuning uchun DNS lookuplarni Google DNS orqali qilamiz.
dns.setServers(['8.8.8.8', '8.8.4.4']);

/**
 * Connect to MongoDB Atlas.
 * Exits the process with a readable diagnostic if the connection fails,
 * because nothing in the app works without the database.
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('✗ MONGODB_URI is missing. Copy .env.example to .env and fill it in.');
    process.exit(1);
  }

  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`✓ MongoDB connected → ${mongoose.connection.name}`);
  } catch (err) {
    console.error('✗ MongoDB connection failed:', err.message);
    console.error('  Checklist:');
    console.error('  1. Is your IP whitelisted in Atlas? (Network Access → Add IP → 0.0.0.0/0 for testing)');
    console.error('  2. Is the password in MONGODB_URI URL-encoded? (special chars like @ must be %40)');
    console.error('  3. Does the database user have readWrite permissions?');
    process.exit(1);
  }

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB runtime error:', err.message);
  });
}

module.exports = connectDB;