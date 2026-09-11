const path = require('path');
const fs = require('fs');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const folderRoutes = require('./routes/folders');
const fileRoutes = require('./routes/files');
const shareRoutes = require('./routes/share');
const activityRoutes = require('./routes/activity');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Trust reverse proxy (essential for Render, Heroku, Cloudflare, Nginx)
app.set('trust proxy', 1);

// Security HTTP headers configured for media streaming and cross-origin compatibility
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Disable ETags to prevent stale 304 caching of user storage quotas
app.set('etag', false);

// CORS configuration supporting credentials and all origins
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan('dev'));

// Ensure real-time API responses are never cached by browsers or edge proxies
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// Production rate limiter for Auth to prevent brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 120, // generous threshold to prevent accidental lockouts
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again in a few minutes.',
  },
});

// Health check route — responds immediately for Render / Docker orchestrators
app.get('/api/health', (req, res) => {
  const dbStatus =
    mongoose.connection.readyState === 1
      ? 'connected'
      : mongoose.connection.readyState === 2
      ? 'connecting'
      : 'disconnected';

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    environment: process.env.NODE_ENV || 'development',
    port: config.port,
  });
});

// Mount API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/activity', activityRoutes);

// Serve frontend static build in production (Unified Render Deployment)
const candidateDistPaths = [
  path.resolve(__dirname, '../../frontend/dist'),
  path.resolve(__dirname, '../frontend/dist'),
  path.resolve(process.cwd(), 'frontend/dist'),
  path.resolve(process.cwd(), 'dist'),
];

const frontendDistPath = candidateDistPaths.find((p) => fs.existsSync(p));
if (frontendDistPath) {
  console.log('📁 Serving production frontend from:', frontendDistPath);
  app.use(express.static(frontendDistPath));

  // SPA client-side fallback for all non-API web routes
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  console.log('ℹ️ Frontend dist not found; running in API mode.');
}

// 404 Route handler for API endpoints
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Generic 404 for unhandled requests
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use(errorHandler);

// Start HTTP Server immediately so port is open for health checks and Render
const PORT = config.port;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Drivora server listening on 0.0.0.0:${PORT}`);
});

// Connect to MongoDB Atlas with resilient retry logic
let isConnecting = false;
async function connectWithRetry(maxRetries = 10, delayMs = 3000) {
  if (isConnecting || mongoose.connection.readyState === 1) return;
  isConnecting = true;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Connecting to MongoDB Atlas (Attempt ${attempt}/${maxRetries})...`);
      await mongoose.connect(config.mongoUri);
      console.log('✅ Connected to MongoDB Atlas successfully');
      isConnecting = false;
      return;
    } catch (err) {
      console.error(`⚠️ MongoDB connection attempt ${attempt} failed:`, err.message);
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  isConnecting = false;
  console.error('❌ Failed to connect to MongoDB Atlas after all retry attempts.');
}

connectWithRetry();

module.exports = app;
