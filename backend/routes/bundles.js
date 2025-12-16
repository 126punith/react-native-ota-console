const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const Version = require('../models/Version');

const router = express.Router();

// Configure multer for bundle uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/bundles');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.bundle';
    cb(null, `bundle-${uniqueSuffix}${ext}`);
  }
});

// File filter for bundle files (.bundle, .js, .zip)
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedTypes = ['.bundle', '.js', '.zip'];
  const allowedMimes = [
    'application/javascript',
    'application/octet-stream',
    'application/zip',
    'text/javascript'
  ];
  
  if (allowedTypes.includes(ext) || allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only bundle files (.bundle, .js, .zip) are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_BUNDLE_SIZE) || 50 * 1024 * 1024 // 50MB default
  }
});

// Multer error handler middleware
const handleMulterError = (err, req, res, next) => {
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      const maxSizeMB = (parseInt(process.env.MAX_BUNDLE_SIZE) || 50 * 1024 * 1024) / (1024 * 1024);
      console.error(`❌ Bundle file too large. Maximum size: ${maxSizeMB}MB`);
      return res.status(413).json({
        error: {
          message: `Bundle file too large. Maximum file size is ${maxSizeMB}MB.`,
          code: 'FILE_TOO_LARGE',
          maxSize: maxSizeMB
        }
      });
    }
    console.error(`❌ Multer upload error: ${err.message}`);
    return res.status(400).json({
      error: {
        message: `Upload failed: ${err.message}`,
        code: 'UPLOAD_ERROR'
      }
    });
  }
  next(err);
};

// Upload bundle for a version
router.post('/upload',
  authenticateToken,
  upload.single('bundle'),
  handleMulterError,
  [
    body('versionId').isInt({ min: 1 }).withMessage('Version ID is required'),
  ],
  async (req, res, next) => {
    try {
      console.log('\n=== Bundle Upload Request Started ===');
      console.log(`User: ${req.user.email} (ID: ${req.user.id})`);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('❌ Validation errors:', errors.array());
        if (req.file) {
          fs.unlinkSync(req.file.path);
          console.log('  Deleted uploaded file due to validation failure');
        }
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.file) {
        console.log('❌ No bundle file received');
        return res.status(400).json({ error: 'Bundle file is required' });
      }

      const { versionId } = req.body;

      console.log(`✓ Bundle file received: ${req.file.originalname}`);
      console.log(`  File size: ${(req.file.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Saved to: ${req.file.path}`);

      // Find the version
      const version = await Version.findById(versionId);
      if (!version) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: 'Version not found' });
      }

      // Delete old bundle if exists
      if (version.bundle_path && fs.existsSync(version.bundle_path)) {
        fs.unlinkSync(version.bundle_path);
        console.log(`  Deleted old bundle: ${version.bundle_path}`);
      }

      // Update version with bundle path
      const pool = require('../config/database');
      await pool.query(
        'UPDATE versions SET bundle_path = $1 WHERE id = $2',
        [req.file.path, versionId]
      );

      console.log(`✓ Bundle uploaded and linked to version ${versionId}`);
      console.log(`  Version: ${version.version_name} (${version.version_code})`);
      console.log(`=== Bundle Upload Completed Successfully ===\n`);

      res.json({
        message: 'Bundle uploaded successfully',
        bundlePath: req.file.path,
        version: {
          id: version.id,
          versionName: version.version_name,
          versionCode: version.version_code
        }
      });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      next(error);
    }
  }
);

// Download bundle file
router.get('/:versionId/download', async (req, res, next) => {
  let fileStream = null;

  try {
    const version = await Version.findById(req.params.versionId);

    if (!version || !version.bundle_path) {
      return res.status(404).json({ error: 'Bundle not found' });
    }

    const filePath = path.resolve(version.bundle_path);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Bundle file not found on server' });
    }

    // Get file stats for Content-Length header
    const stat = fs.statSync(filePath);
    const filename = `${version.app_id}-${version.version_name}.bundle`;

    // Determine content type
    const ext = path.extname(filePath).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.js' || ext === '.bundle') {
      contentType = 'application/javascript';
    } else if (ext === '.zip') {
      contentType = 'application/zip';
    }

    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'no-cache');

    // Create read stream
    fileStream = fs.createReadStream(filePath);

    // Handle stream errors gracefully
    fileStream.on('error', (err) => {
      if (err.code === 'EPIPE' || err.code === 'ECONNRESET') {
        console.log(`⚠️ [Bundle Download] Client disconnected: ${err.code} - ${filename}`);
        fileStream.destroy();
      } else {
        console.error(`❌ [Bundle Download] Stream error:`, err);
        if (!res.headersSent) {
          next(err);
        }
      }
    });

    // Handle client disconnect
    req.on('close', () => {
      if (fileStream && !fileStream.destroyed) {
        console.log(`⚠️ [Bundle Download] Request closed by client: ${filename}`);
        fileStream.destroy();
      }
    });

    // Pipe file to response
    fileStream.pipe(res);

    console.log(`📥 [Bundle Download] Starting download: ${filename} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);

  } catch (error) {
    if (fileStream && !fileStream.destroyed) {
      fileStream.destroy();
    }

    if (!res.headersSent) {
      next(error);
    } else {
      console.error(`❌ [Bundle Download] Error after headers sent:`, error);
    }
  }
});

module.exports = router;


