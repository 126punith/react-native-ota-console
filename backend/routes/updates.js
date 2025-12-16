const express = require('express');
const { query, validationResult } = require('express-validator');
const apiAuth = require('../middleware/apiAuth');
const Version = require('../models/Version');
const UpdateLog = require('../models/UpdateLog');
const { compareVersions } = require('../utils/versionParser');

const router = express.Router();

// Check for available updates
router.get('/check',
  apiAuth,
  [
    query('currentVersion').notEmpty().withMessage('Current version is required'),
    query('currentVersionCode').optional().isInt({ min: 1 }),
    query('deviceId').optional().isString()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { currentVersion, currentVersionCode, deviceId } = req.query;
      const appId = req.appId;

      console.log('🔍 [Updates] Update check request received:');
      console.log('  - App ID:', appId);
      console.log('  - Current Version:', currentVersion);
      console.log('  - Current Version Code:', currentVersionCode);
      console.log('  - Device ID:', deviceId);

      // Get all versions greater than current
      let availableVersions;
      
      if (currentVersionCode) {
        // Use version code if available (more reliable)
        const currentCode = parseInt(currentVersionCode);
        console.log(`🔍 [Updates] Looking for versions with version_code > ${currentCode} for app ${appId}`);
        availableVersions = await Version.findUpdates(appId, currentCode);
        console.log(`🔍 [Updates] Found ${availableVersions.length} available version(s):`, 
          availableVersions.map(v => ({ id: v.id, versionName: v.version_name, versionCode: v.version_code }))
        );
      } else {
        // Fall back to version name comparison
        console.log(`🔍 [Updates] Using version name comparison for app ${appId}`);
        const allVersions = await Version.findAll(appId);
        console.log(`🔍 [Updates] All versions in database:`, 
          allVersions.map(v => ({ id: v.id, versionName: v.version_name, versionCode: v.version_code }))
        );
        availableVersions = allVersions.filter(v => {
          const comparison = compareVersions(currentVersion, v.version_name);
          console.log(`🔍 [Updates] Comparing "${currentVersion}" with "${v.version_name}": ${comparison}`);
          return comparison < 0; // Available version is newer
        });
        console.log(`🔍 [Updates] Found ${availableVersions.length} available version(s) after filtering`);
      }

      if (availableVersions.length === 0) {
        console.log('❌ [Updates] No updates available - app is up to date');
        return res.json({
          updateAvailable: false,
          message: 'App is up to date'
        });
      }

      // Get the latest available version (highest version code)
      const latestVersion = availableVersions.reduce((latest, current) => {
        return current.version_code > latest.version_code ? current : latest;
      }, availableVersions[0]);

      // Log update check
      if (deviceId) {
        await UpdateLog.create({
          appId,
          fromVersion: currentVersion,
          toVersion: latestVersion.version_name,
          updateType: latestVersion.update_type,
          deviceId,
          status: 'pending'
        });
      }

      // Construct download URLs
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const apkDownloadUrl = `${baseUrl}/api/apks/${latestVersion.id}/download`;
      const bundleDownloadUrl = latestVersion.bundle_path 
        ? `${baseUrl}/api/bundles/${latestVersion.id}/download`
        : null;

      // Calculate file sizes if files exist
      const fs = require('fs');
      let apkSize = null;
      let bundleSize = null;

      if (latestVersion.apk_path && fs.existsSync(latestVersion.apk_path)) {
        apkSize = fs.statSync(latestVersion.apk_path).size;
      }

      if (latestVersion.bundle_path && fs.existsSync(latestVersion.bundle_path)) {
        bundleSize = fs.statSync(latestVersion.bundle_path).size;
      }

      res.json({
        updateAvailable: true,
        update: {
          versionName: latestVersion.version_name,
          versionCode: latestVersion.version_code,
          updateType: latestVersion.update_type,
          releaseNotes: latestVersion.release_notes,
          downloadUrl: apkDownloadUrl, // For backward compatibility
          bundleUrl: bundleDownloadUrl, // For bundle updates
          apkSize: apkSize,
          bundleSize: bundleSize
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Report update status
router.post('/report',
  apiAuth,
  async (req, res, next) => {
    try {
      const { status, fromVersion, toVersion, updateType, errorMessage } = req.body;
      const appId = req.appId;
      const deviceId = req.query.deviceId || req.body.deviceId || 'unknown';

      if (!status || !toVersion) {
        return res.status(400).json({ error: 'Status and toVersion are required' });
      }

      // Find or create update log entry
      const logs = await UpdateLog.findByAppId(appId, 10);
      const existingLog = logs.find(log => 
        log.to_version === toVersion && 
        log.device_id === deviceId &&
        log.status === 'pending'
      );

      if (existingLog) {
        await UpdateLog.updateStatus(existingLog.id, status, errorMessage);
      } else {
        await UpdateLog.create({
          appId,
          fromVersion: fromVersion || 'unknown',
          toVersion,
          updateType: updateType || 'minor',
          deviceId,
          status
        });
      }

      res.json({ message: 'Update status reported successfully' });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;

