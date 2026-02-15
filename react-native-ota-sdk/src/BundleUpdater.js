import { NativeModules, Platform, DeviceEventEmitter } from 'react-native';
import NativeBundleManager from './NativeBundleManager';

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
    this.useNativeModule = NativeBundleManager.isAvailable && Platform.OS === 'android';
    
    // Set up download progress listener if native module is available
    if (this.useNativeModule) {
      DeviceEventEmitter.addListener('OTADownloadProgress', (progress) => {
        const progressPercent = progress.totalBytes > 0 
          ? (progress.receivedBytes / progress.totalBytes) * 100 
          : 0;
        this.onProgress(progressPercent, progress.receivedBytes, progress.totalBytes);
      });
    }
  }

  async ensureCacheDir() {
    if (!RNFS && !this.useNativeModule) {
      throw new Error('react-native-fs is required for bundle updates when native module is not available');
    }
    if (RNFS) {
    const exists = await RNFS.exists(this.bundleCacheDir);
    if (!exists) {
      await RNFS.mkdir(this.bundleCacheDir);
      }
    }
  }

  async downloadBundle(downloadUrl, versionName) {
    try {
      // Use native module if available (Android only)
      if (this.useNativeModule) {
        console.log('📦 [BundleUpdater] Using native module for bundle download');
        const packageInfo = await NativeBundleManager.downloadBundle(downloadUrl, versionName);
        
        // Get bundle path from package info
        const bundlePath = packageInfo?.bundlePath || packageInfo?.relativeBundlePath;
        if (bundlePath) {
          this.onSuccess(bundlePath);
          return bundlePath;
        }
        throw new Error('Bundle path not found in package info');
      }

      // Fallback to RNFS download
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
      // Use native module if available (Android only)
      if (this.useNativeModule) {
        console.log('🔄 [BundleUpdater] Using native module to load bundle');
        await NativeBundleManager.loadBundle(bundlePath);
        return true;
      }

      // Fallback: try OTABundleLoader if available
      if (NativeModules.OTABundleLoader) {
        await NativeModules.OTABundleLoader.loadBundle(bundlePath);
        return true;
      } else {
        // Fallback: restart app with new bundle
        console.warn('⚠️ [BundleUpdater] Native bundle loader not available. App restart required.');
        return false;
      }
    } catch (error) {
      console.error('Bundle load error:', error);
      throw error;
    }
  }

  async applyUpdate(bundlePath) {
    try {
      // Use native module if available
      if (this.useNativeModule) {
        console.log('✅ [BundleUpdater] Using native module to apply update');
        // Install the bundle first
        await NativeBundleManager.installBundle(bundlePath);
        // Then load it
        await NativeBundleManager.loadBundle(bundlePath);
        return true;
      }

      // Fallback to file-based approach
      const activeBundlePath = `${this.bundleCacheDir}/active.bundle`;
      
      // Copy downloaded bundle to active bundle
      if (RNFS) {
      await RNFS.copyFile(bundlePath, activeBundlePath);
      }

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
      // Use native module if available
      if (this.useNativeModule) {
        await NativeBundleManager.clearBundles();
        return;
      }

      // Fallback to file-based cleanup
      if (RNFS) {
      await this.ensureCacheDir();
      const files = await RNFS.readDir(this.bundleCacheDir);
      
      for (const file of files) {
        if (file.name !== 'active.bundle' && file.name !== `bundle-${keepVersion}.bundle`) {
          await RNFS.unlink(file.path);
          }
        }
      }
    } catch (error) {
      console.error('Clear old bundles error:', error);
      // Don't throw - cleanup is not critical
    }
  }
}

export default BundleUpdater;

