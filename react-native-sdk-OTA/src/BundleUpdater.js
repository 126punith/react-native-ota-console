import { NativeModules, Platform } from 'react-native';

// Optional import
let RNFS = null;
try {
  RNFS = require('react-native-fs');
} catch (e) {
  console.warn('react-native-fs not available');
}

class BundleUpdater {
  constructor(config) {
    this.onProgress = config.onProgress || (() => {});
    this.onError = config.onError || (() => {});
    this.onSuccess = config.onSuccess || (() => {});
    this.bundleCacheDir = RNFS ? `${RNFS.CachesDirectoryPath}/OTA_Bundles` : '/tmp/OTA_Bundles';
  }

  async ensureCacheDir() {
    if (!RNFS) {
      throw new Error('react-native-fs is required for bundle updates');
    }
    const exists = await RNFS.exists(this.bundleCacheDir);
    if (!exists) {
      await RNFS.mkdir(this.bundleCacheDir);
    }
  }

  async downloadBundle(downloadUrl, versionName) {
    try {
      await this.ensureCacheDir();

      const fileName = `bundle-${versionName}.bundle`;
      const filePath = `${this.bundleCacheDir}/${fileName}`;

      // Delete existing bundle if present
      if (await RNFS.exists(filePath)) {
        await RNFS.unlink(filePath);
      }

      const downloadResult = RNFS.downloadFile({
        fromUrl: downloadUrl,
        toFile: filePath,
        progress: (res) => {
          const progress = (res.bytesWritten / res.contentLength) * 100;
          this.onProgress(progress, res.bytesWritten, res.contentLength);
        },
        background: true,
        discretionary: true,
        cacheable: false,
      });

      const result = await downloadResult.promise;

      if (result.statusCode === 200) {
        this.onSuccess(filePath);
        return filePath;
      } else {
        throw new Error(`Bundle download failed with status: ${result.statusCode}`);
      }
    } catch (error) {
      console.error('Bundle download error:', error);
      this.onError(error);
      throw error;
    }
  }

  async loadBundle(bundlePath) {
    try {
      // In React Native, you typically need native module support to load bundles
      // This is a placeholder - actual implementation depends on your bundler setup
      
      // For Metro bundler, you might need to:
      // 1. Register the bundle with Metro
      // 2. Reload the app or specific modules
      
      // Example using a hypothetical native module:
      if (NativeModules.OTABundleLoader) {
        await NativeModules.OTABundleLoader.loadBundle(bundlePath);
        return true;
      } else {
        // Fallback: restart app with new bundle
        console.warn('Native bundle loader not available. App restart required.');
        return false;
      }
    } catch (error) {
      console.error('Bundle load error:', error);
      throw error;
    }
  }

  async applyUpdate(bundlePath) {
    try {
      // Set the new bundle as active
      const activeBundlePath = `${this.bundleCacheDir}/active.bundle`;
      
      // Copy downloaded bundle to active bundle
      await RNFS.copyFile(bundlePath, activeBundlePath);

      // Load the new bundle
      await this.loadBundle(activeBundlePath);

      return true;
    } catch (error) {
      console.error('Apply update error:', error);
      throw error;
    }
  }

  getActiveBundlePath() {
    return `${this.bundleCacheDir}/active.bundle`;
  }

  async clearOldBundles(keepVersion = null) {
    try {
      await this.ensureCacheDir();
      const files = await RNFS.readDir(this.bundleCacheDir);
      
      for (const file of files) {
        if (file.name !== 'active.bundle' && file.name !== `bundle-${keepVersion}.bundle`) {
          await RNFS.unlink(file.path);
        }
      }
    } catch (error) {
      console.error('Clear old bundles error:', error);
      // Don't throw - cleanup is not critical
    }
  }
}

export default BundleUpdater;

