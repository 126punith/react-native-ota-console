const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();
const path = require('path');
const fs = require('fs');

// Import routes
const authRoutes = require('./routes/auth');
const apkRoutes = require('./routes/apks');
const updateRoutes = require('./routes/updates');

const app = express();
const PORT = process.env.PORT || 3001;

// Create upload directories if they don't exist
const uploadDir = path.join(__dirname, 'uploads');
const apkDir = path.join(uploadDir, 'apks');
const bundleDir = path.join(uploadDir, 'bundles');

[uploadDir, apkDir, bundleDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging middleware (for debugging)
app.use((req, res, next) => {
  console.log(`📥 [${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (req.query && Object.keys(req.query).length > 0) {
    console.log(`   Query:`, req.query);
  }
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`   Body:`, JSON.stringify(req.body, null, 2).substring(0, 200));
  }
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/apks', apkRoutes);
app.use('/api/updates', updateRoutes);

// Health check
app.get('/health', async (req, res) => {
  const pool = require('./config/database');
  try {
    // Test database connection
    await pool.query('SELECT 1');
    res.json({ 
      status: 'ok', 
      database: 'connected',
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'error', 
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString() 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  // Handle Multer file size errors
  if (err.name === 'MulterError' && err.code === 'LIMIT_FILE_SIZE') {
    const maxSizeMB = (parseInt(process.env.MAX_FILE_SIZE) || 200 * 1024 * 1024) / (1024 * 1024);
    console.error(`❌ File too large. Maximum size: ${maxSizeMB}MB`);
    return res.status(413).json({
      error: {
        message: `File too large. Maximum file size is ${maxSizeMB}MB.`,
        code: 'FILE_TOO_LARGE',
        maxSize: maxSizeMB
      }
    });
  }

  // Handle other Multer errors
  if (err.name === 'MulterError') {
    console.error(`❌ Multer upload error: ${err.message}`);
    return res.status(400).json({
      error: {
        message: `Upload failed: ${err.message}`,
        code: 'UPLOAD_ERROR'
      }
    });
  }

  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// Listen on all interfaces (0.0.0.0) to allow connections from emulator/network
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Server accessible at:`);
  console.log(`   - http://localhost:${PORT}`);
  console.log(`   - http://0.0.0.0:${PORT}`);
  console.log(`   - http://10.0.2.2:${PORT} (Android emulator)`);
  console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;

