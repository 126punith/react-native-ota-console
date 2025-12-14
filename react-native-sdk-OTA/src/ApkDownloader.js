import { Platform, Alert, Linking } from 'react-native';

// Optional imports - handle gracefully if not available
let RNFS = null;
let InstallApk = null;

try {
  RNFS = require('react-native-fs');
} catch (e) {
  console.warn('react-native-fs not available');
}

try {
  InstallApk = require('react-native-install-apk');
} catch (e) {
  console.warn('react-native-install-apk not available, using fallback');
}

class ApkDownloader {
  constructor(config) {
    this.onProgress = config.onProgress || (() => {});
    this.onError = config.onError || (() => {});
    this.onSuccess = config.onSuccess || (() => {});
  }

  async downloadApk(downloadUrl, versionName) {
    try {
      if (!RNFS) {
        throw new Error('react-native-fs is required for APK downloads');
      }

      console.log(`📥 [ApkDownloader] Starting download: ${versionName} from ${downloadUrl}`);

      // Debug: Log all available paths
      console.log(`🔍 [ApkDownloader] Available paths:`, {
        CachesDirectoryPath: RNFS.CachesDirectoryPath || 'NOT AVAILABLE',
        ExternalStorageDirectoryPath: RNFS.ExternalStorageDirectoryPath || 'NOT AVAILABLE',
        ExternalDirectoryPath: RNFS.ExternalDirectoryPath || 'NOT AVAILABLE',
        DocumentDirectoryPath: RNFS.DocumentDirectoryPath || 'NOT AVAILABLE',
        DownloadDirectoryPath: RNFS.DownloadDirectoryPath || 'NOT AVAILABLE',
        MainBundlePath: RNFS.MainBundlePath || 'NOT AVAILABLE',
      });

      // Try different base paths in order of preference for Android scoped storage compatibility
      // Prefer CachesDirectoryPath or ExternalStorageDirectoryPath (Android 10+ compatible)
      // over DownloadDirectoryPath which may have scoped storage restrictions
      let downloadPath = null;
      let basePath = null;
      let pathSource = null;
      
      // Priority order for Android scoped storage compatibility:
      // 1. CachesDirectoryPath - always accessible, good for temporary APK downloads (app-specific, no permissions needed)
      // 2. ExternalStorageDirectoryPath - app's external storage directory (app-specific, usually accessible)
      // 3. DocumentDirectoryPath - app's document directory (app-specific)
      // 4. DownloadDirectoryPath - may have restrictions on Android 10+ (requires permissions, may fail)
      
      // Explicitly prefer app-specific directories that don't require external storage permissions
      if (RNFS.CachesDirectoryPath && typeof RNFS.CachesDirectoryPath === 'string' && RNFS.CachesDirectoryPath.length > 0) {
        basePath = RNFS.CachesDirectoryPath;
        downloadPath = `${basePath}/OTA_Updates`;
        pathSource = 'CachesDirectoryPath';
        console.log(`✅ [ApkDownloader] Selected CachesDirectoryPath: ${downloadPath}`);
      } else if (RNFS.ExternalStorageDirectoryPath && typeof RNFS.ExternalStorageDirectoryPath === 'string' && RNFS.ExternalStorageDirectoryPath.length > 0) {
        basePath = RNFS.ExternalStorageDirectoryPath;
        downloadPath = `${basePath}/OTA_Updates`;
        pathSource = 'ExternalStorageDirectoryPath';
        console.log(`✅ [ApkDownloader] Selected ExternalStorageDirectoryPath: ${downloadPath}`);
      } else if (RNFS.ExternalDirectoryPath && typeof RNFS.ExternalDirectoryPath === 'string' && RNFS.ExternalDirectoryPath.length > 0) {
        basePath = RNFS.ExternalDirectoryPath;
        downloadPath = `${basePath}/OTA_Updates`;
        pathSource = 'ExternalDirectoryPath';
        console.log(`✅ [ApkDownloader] Selected ExternalDirectoryPath: ${downloadPath}`);
      } else if (RNFS.DocumentDirectoryPath && typeof RNFS.DocumentDirectoryPath === 'string' && RNFS.DocumentDirectoryPath.length > 0) {
        basePath = RNFS.DocumentDirectoryPath;
        downloadPath = `${basePath}/OTA_Updates`;
        pathSource = 'DocumentDirectoryPath';
        console.log(`✅ [ApkDownloader] Selected DocumentDirectoryPath: ${downloadPath}`);
      } else if (RNFS.DownloadDirectoryPath && typeof RNFS.DownloadDirectoryPath === 'string' && RNFS.DownloadDirectoryPath.length > 0) {
        basePath = RNFS.DownloadDirectoryPath;
        downloadPath = `${basePath}/OTA_Updates`;
        pathSource = 'DownloadDirectoryPath';
        console.log(`⚠️ [ApkDownloader] WARNING: Using DownloadDirectoryPath (fallback) - may have Android 10+ scoped storage restrictions: ${downloadPath}`);
      } else {
        throw new Error('No valid download directory available. Check react-native-fs installation and ensure native modules are properly linked.');
      }

      console.log(`📁 [ApkDownloader] Selected base path: ${basePath} (${pathSource})`);
      console.log(`📁 [ApkDownloader] Target download directory: ${downloadPath}`);

      // Verify base directory exists
      const baseExists = await RNFS.exists(basePath);
      if (!baseExists) {
        throw new Error(`Base directory does not exist: ${basePath} (${pathSource})`);
      }
      console.log(`✅ [ApkDownloader] Base directory exists: ${basePath}`);

      // Create directory recursively by creating parent directories one by one
      const pathParts = downloadPath.split('/').filter(part => part.length > 0);
      let currentPath = pathParts[0] === '' ? '/' : pathParts[0];
      
      for (let i = 1; i < pathParts.length; i++) {
        currentPath += '/' + pathParts[i];
        const exists = await RNFS.exists(currentPath);
        if (!exists) {
          console.log(`📁 [ApkDownloader] Creating directory: ${currentPath}`);
          try {
            await RNFS.mkdir(currentPath);
            // Verify directory was actually created
            const created = await RNFS.exists(currentPath);
            if (!created) {
              throw new Error(`Directory creation reported success but directory does not exist: ${currentPath}`);
            }
            console.log(`✅ [ApkDownloader] Directory created successfully: ${currentPath}`);
          } catch (mkdirError) {
            // If mkdir fails, check if directory was created by another process
            const existsAfterError = await RNFS.exists(currentPath);
            if (!existsAfterError) {
              throw new Error(`Failed to create directory: ${currentPath}. Error: ${mkdirError.message}. Path source: ${pathSource}`);
            }
            console.log(`✅ [ApkDownloader] Directory already exists (created by another process): ${currentPath}`);
          }
        } else {
          console.log(`✅ [ApkDownloader] Directory already exists: ${currentPath}`);
        }
      }

      // Final verification: ensure the download directory exists before proceeding
      const downloadDirExists = await RNFS.exists(downloadPath);
      if (!downloadDirExists) {
        throw new Error(`Download directory does not exist after creation attempt: ${downloadPath}. This may be due to Android scoped storage restrictions.`);
      }
      console.log(`✅ [ApkDownloader] Download directory verified: ${downloadPath}`);

      const fileName = `app-update-${versionName}.apk`;
      const filePath = `${downloadPath}/${fileName}`;

      console.log(`📁 [ApkDownloader] Target file path: ${filePath}`);

      // Delete existing file if present
      if (await RNFS.exists(filePath)) {
        console.log(`🗑️ [ApkDownloader] Deleting existing file: ${filePath}`);
        try {
          await RNFS.unlink(filePath);
          console.log(`✅ [ApkDownloader] Existing file deleted`);
        } catch (unlinkError) {
          console.warn(`⚠️ [ApkDownloader] Failed to delete existing file (may not exist): ${unlinkError.message}`);
        }
      }

      // One final check: verify directory still exists before starting download
      const finalDirCheck = await RNFS.exists(downloadPath);
      if (!finalDirCheck) {
        throw new Error(`Download directory disappeared before download: ${downloadPath}. Check Android storage permissions.`);
      }

      // Test write access to the directory by attempting to write a small test file
      const testFilePath = `${downloadPath}/.test_write`;
      try {
        console.log(`🧪 [ApkDownloader] Testing write access to directory: ${downloadPath}`);
        await RNFS.writeFile(testFilePath, 'test', 'utf8');
        const testFileExists = await RNFS.exists(testFilePath);
        if (testFileExists) {
          await RNFS.unlink(testFilePath);
          console.log(`✅ [ApkDownloader] Write access verified for directory: ${downloadPath}`);
        } else {
          throw new Error(`Write test failed: test file was not created at ${testFilePath}`);
        }
      } catch (writeTestError) {
        throw new Error(`Cannot write to directory ${downloadPath}. This may be due to Android scoped storage restrictions or missing permissions. Error: ${writeTestError.message}. Try using an app-specific directory.`);
      }

      console.log(`⬇️ [ApkDownloader] Starting file download to: ${filePath}`);
      const downloadResult = RNFS.downloadFile({
        fromUrl: downloadUrl,
        toFile: filePath,
        progress: (res) => {
          const progress = (res.bytesWritten / res.contentLength) * 100;
          this.onProgress(progress, res.bytesWritten, res.contentLength);
        },
        background: false, // Set to false to avoid issues with scoped storage
        discretionary: false,
        cacheable: false,
      });

      const result = await downloadResult.promise;

      console.log(`📊 [ApkDownloader] Download completed with status: ${result.statusCode}`);

      if (result.statusCode === 200) {
        // Verify file exists after download
        const fileExists = await RNFS.exists(filePath);
        if (!fileExists) {
          throw new Error(`Download completed with status 200 but file not found at: ${filePath}`);
        }

        // Verify file size is reasonable (not empty)
        try {
          const stat = await RNFS.stat(filePath);
          console.log(`📊 [ApkDownloader] File size: ${(stat.size / 1024 / 1024).toFixed(2)} MB`);
          
          if (stat.size === 0) {
            throw new Error(`Downloaded file is empty (0 bytes): ${filePath}`);
          }
          
          // APK files should be at least a few KB (very small threshold)
          if (stat.size < 1024) {
            throw new Error(`Downloaded file is suspiciously small (${stat.size} bytes). Expected APK file.`);
          }
        } catch (statError) {
          throw new Error(`Failed to verify downloaded file: ${statError.message}`);
        }

        console.log(`✅ [ApkDownloader] Download successful: ${filePath}`);
        this.onSuccess(filePath);
        return filePath;
      } else {
        throw new Error(`Download failed with HTTP status: ${result.statusCode}. Check server logs for details.`);
      }
    } catch (error) {
      console.error(`❌ [ApkDownloader] Download error:`, {
        message: error.message,
        versionName,
        downloadUrl,
        error: error
      });
      this.onError(error);
      throw error;
    }
  }

  async installApk(filePath) {
    try {
      if (Platform.OS !== 'android') {
        throw new Error('APK installation is only supported on Android');
      }

      // Check if file exists
      const exists = await RNFS.exists(filePath);
      if (!exists) {
        throw new Error('APK file not found');
      }

      // Request install permissions
      if (Platform.Version >= 26) {
        // Android 8.0+ requires INSTALL_PERMISSION
        if (InstallApk) {
          try {
            await InstallApk.installApk(filePath);
            return true;
          } catch (installError) {
            console.warn('InstallApk failed, using fallback:', installError);
          }
        }
        
        // Fallback to system installer via intent
        try {
          const supported = await Linking.canOpenURL(`file://${filePath}`);
          if (supported) {
            await Linking.openURL(`file://${filePath}`);
            return true;
          } else {
            // Try with content:// URI
            const contentUri = `content://${filePath}`;
            const contentSupported = await Linking.canOpenURL(contentUri);
            if (contentSupported) {
              await Linking.openURL(contentUri);
              return true;
            }
            throw new Error('Unable to open APK file for installation');
          }
        } catch (linkError) {
          throw new Error(`Installation failed: ${linkError.message}`);
        }
      } else {
        // For older Android versions
        if (InstallApk) {
          await InstallApk.installApk(filePath);
        } else {
          // Fallback
          const supported = await Linking.canOpenURL(`file://${filePath}`);
          if (supported) {
            await Linking.openURL(`file://${filePath}`);
          } else {
            throw new Error('Installation package not available');
          }
        }
      }

      return true;
    } catch (error) {
      console.error('APK installation error:', error);
      throw error;
    }
  }

  showInstallPrompt(filePath, versionName, releaseNotes) {
    Alert.alert(
      'Update Available',
      `A new version (${versionName}) is available. Would you like to install it now?${
        releaseNotes ? `\n\n${releaseNotes}` : ''
      }`,
      [
        {
          text: 'Later',
          style: 'cancel',
        },
        {
          text: 'Install',
          onPress: () => this.installApk(filePath),
        },
      ],
      { cancelable: false }
    );
  }

  showForceUpdateAlert() {
    Alert.alert(
      'Update Required',
      'A critical update is available. The app will be updated now.',
      [{ text: 'OK' }],
      { cancelable: false }
    );
  }
}

export default ApkDownloader;

