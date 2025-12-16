const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const Version = require('../models/Version');
const { getUpdateType, parseVersionName } = require('../utils/versionParser');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/apks');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

// File filter for APK files
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/vnd.android.package-archive' || 
      path.extname(file.originalname).toLowerCase() === '.apk') {
    cb(null, true);
  } else {
    cb(new Error('Only APK files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 200 * 1024 * 1024 // 200MB default (was 50MB)
  }
});

// Multer error handler middleware
const handleMulterError = (err, req, res, next) => {
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
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

// Upload APK
router.post('/upload', 
  authenticateToken,
  upload.single('apk'),
  handleMulterError,
  [
    body('appId').notEmpty().withMessage('App ID is required'),
    body('versionName').notEmpty().withMessage('Version name is required'),
    body('versionCode').isInt({ min: 1 }).withMessage('Version code must be a positive integer'),
    body('updateType').isIn(['major', 'minor']).withMessage('Update type must be major or minor'),
    body('releaseNotes').optional().isString()
  ],
  async (req, res, next) => {
    try {
      console.log('\n=== APK Upload Request Started ===');
      console.log(`User: ${req.user.email} (ID: ${req.user.id})`);
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('❌ Validation errors:', errors.array());
        // Delete uploaded file if validation fails
        if (req.file) {
          fs.unlinkSync(req.file.path);
          console.log('  Deleted uploaded file due to validation failure');
        }
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.file) {
        console.log('❌ No APK file received');
        return res.status(400).json({ error: 'APK file is required' });
      }

      console.log(`✓ APK file received: ${req.file.originalname}`);
      console.log(`  File size: ${(req.file.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Saved to: ${req.file.path}`);
      console.log(`  File exists: ${fs.existsSync(req.file.path)}`);

      const { appId, versionName, versionCode, updateType, releaseNotes } = req.body;
      
      console.log(`\nVersion Details:`);
      console.log(`  App ID: ${appId}`);
      console.log(`  Version Name: ${versionName}`);
      console.log(`  Version Code: ${versionCode}`);
      console.log(`  Update Type: ${updateType || 'auto-detect'}`);
      console.log(`  Release Notes: ${releaseNotes ? releaseNotes.substring(0, 50) + '...' : 'None'}`);

      // Check if version already exists
      console.log(`\nChecking for existing version...`);
      const existingVersion = await Version.findByAppIdAndVersionCode(appId, parseInt(versionCode));
      if (existingVersion) {
        console.log(`❌ Version already exists: ${appId} v${versionCode} (ID: ${existingVersion.id})`);
        // Delete uploaded file
        fs.unlinkSync(req.file.path);
        console.log('  Deleted uploaded file');
        return res.status(400).json({ error: 'Version with this version code already exists' });
      }
      console.log('✓ No duplicate version found');

      // Determine update type based on existing versions if not explicitly provided
      let finalUpdateType = updateType;
      if (!updateType) {
        console.log('Auto-determining update type...');
        const latestVersion = await Version.findLatest(appId);
        if (latestVersion) {
          finalUpdateType = getUpdateType(latestVersion.version_name, versionName);
          console.log(`  Latest version: ${latestVersion.version_name}, determined type: ${finalUpdateType}`);
        } else {
          finalUpdateType = 'major'; // First version is always major
          console.log('  First version for this app, defaulting to: major');
        }
      }

      // Create version record
      console.log(`\nCreating version record in database...`);
      const versionData = {
        appId,
        versionName,
        versionCode: parseInt(versionCode),
        updateType: finalUpdateType,
        apkPath: req.file.path,
        bundlePath: null, // Can be uploaded separately via /api/bundles/upload
        releaseNotes: releaseNotes || '',
        createdBy: req.user.id
      };
      
      console.log(`  Data to insert:`, {
        appId: versionData.appId,
        versionName: versionData.versionName,
        versionCode: versionData.versionCode,
        updateType: versionData.updateType,
        apkPath: versionData.apkPath,
        createdBy: versionData.createdBy
      });

      const version = await Version.create(versionData);
      
      console.log(`✓ Version created in database:`);
      console.log(`  Version ID: ${version.id}`);
      console.log(`  App ID: ${version.app_id}`);
      console.log(`  Version Name: ${version.version_name}`);
      console.log(`  Version Code: ${version.version_code}`);
      console.log(`  Update Type: ${version.update_type}`);
      console.log(`  APK Path: ${version.apk_path}`);
      console.log(`  APK File Exists: ${fs.existsSync(version.apk_path)}`);
      console.log(`  Created At: ${version.created_at}`);
      console.log(`=== APK Upload Completed Successfully ===\n`);

      res.status(201).json({
        message: 'APK uploaded successfully',
        version: {
          id: version.id,
          appId: version.app_id,
          versionName: version.version_name,
          versionCode: version.version_code,
          updateType: version.update_type,
          releaseNotes: version.release_notes,
          createdAt: version.created_at
        }
      });
    } catch (error) {
      // Clean up file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      next(error);
    }
  }
);

// List all versions
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const { appId } = req.query;
    const versions = await Version.findAll(appId || null);

    res.json({
      versions: versions.map(v => ({
        id: v.id,
        appId: v.app_id,
        versionName: v.version_name,
        versionCode: v.version_code,
        updateType: v.update_type,
        releaseNotes: v.release_notes,
        createdAt: v.created_at,
        createdBy: v.created_by
      }))
    });
  } catch (error) {
    next(error);
  }
});

// Get version by ID
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const version = await Version.findById(req.params.id);
    
    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }

    res.json({
      version: {
        id: version.id,
        appId: version.app_id,
        versionName: version.version_name,
        versionCode: version.version_code,
        updateType: version.update_type,
        apkPath: version.apk_path,
        bundlePath: version.bundle_path,
        releaseNotes: version.release_notes,
        createdAt: version.created_at,
        createdBy: version.created_by
      }
    });
  } catch (error) {
    next(error);
  }
});

// Download APK file
router.get('/:id/download', async (req, res, next) => {
  let fileStream = null;
  
  try {
    const version = await Version.findById(req.params.id);
    
    console.log(`📥 [APK Download] Request for version ID: ${req.params.id}`);
    
    if (!version) {
      console.log(`❌ [APK Download] Version ${req.params.id} not found in database`);
      return res.status(404).json({ error: 'Version not found' });
    }
    
    console.log(`📥 [APK Download] Version found: ${version.version_name} (${version.version_code})`);
    console.log(`📥 [APK Download] APK path in DB: ${version.apk_path || 'null'}`);
    
    if (!version.apk_path) {
      console.log(`❌ [APK Download] Version ${req.params.id} has no apk_path`);
      return res.status(404).json({ error: 'APK not found - no file path in database' });
    }

    const filePath = path.resolve(version.apk_path);
    console.log(`📥 [APK Download] Resolved file path: ${filePath}`);
    console.log(`📥 [APK Download] File exists: ${fs.existsSync(filePath)}`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log(`❌ [APK Download] File does not exist at path: ${filePath}`);
      console.log(`❌ [APK Download] Current working directory: ${process.cwd()}`);
      return res.status(404).json({ 
        error: 'APK file not found on server',
        details: `File path: ${filePath}` 
      });
    }

    // Get file stats for Content-Length header
    const stat = fs.statSync(filePath);
    const filename = `${version.app_id}-${version.version_name}.apk`;
    
    // Set appropriate headers
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', stat.size);
    
    // Create read stream
    fileStream = fs.createReadStream(filePath);
    
    // Handle stream errors gracefully (ignore EPIPE and ECONNRESET which occur when client disconnects)
    fileStream.on('error', (err) => {
      // EPIPE and ECONNRESET are common when client cancels download or connection closes
      if (err.code === 'EPIPE' || err.code === 'ECONNRESET') {
        console.log(`⚠️ [APK Download] Client disconnected: ${err.code} - ${filename}`);
        // Don't call next() for client disconnections - these are expected
        fileStream.destroy();
      } else {
        console.error(`❌ [APK Download] Stream error:`, err);
        if (!res.headersSent) {
          next(err);
        }
      }
    });
    
    // Handle client disconnect
    req.on('close', () => {
      if (fileStream && !fileStream.destroyed) {
        console.log(`⚠️ [APK Download] Request closed by client: ${filename}`);
        fileStream.destroy();
      }
    });
    
    // Pipe file to response
    fileStream.pipe(res);
    
    console.log(`📥 [APK Download] Starting download: ${filename} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
    
  } catch (error) {
    // Clean up stream if error occurs before piping
    if (fileStream && !fileStream.destroyed) {
      fileStream.destroy();
    }
    
    // Only send error response if headers haven't been sent
    if (!res.headersSent) {
      next(error);
    } else {
      console.error(`❌ [APK Download] Error after headers sent:`, error);
    }
  }
});

// Delete version
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const version = await Version.findById(req.params.id);
    
    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }

    // Soft delete (mark as inactive)
    await Version.delete(req.params.id);

    // Optionally delete physical files
    if (req.query.deleteFiles === 'true') {
      if (version.apk_path && fs.existsSync(version.apk_path)) {
        fs.unlinkSync(version.apk_path);
      }
      if (version.bundle_path && fs.existsSync(version.bundle_path)) {
        fs.unlinkSync(version.bundle_path);
      }
    }

    res.json({ message: 'Version deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

