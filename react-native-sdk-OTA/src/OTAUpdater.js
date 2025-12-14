import VersionChecker from './VersionChecker';
import ApkDownloader from './ApkDownloader';
import BundleUpdater from './BundleUpdater';
import NetworkMonitor from './NetworkMonitor';

class OTAUpdater {
  constructor(config) {
    this.config = {
      apiUrl: config.apiUrl,
      appId: config.appId,
      apiKey: config.apiKey,
      deviceId: config.deviceId,
      currentVersionName: config.currentVersionName, // App version name (e.g., "1.0.0")
      currentVersionCode: config.currentVersionCode, // App version code (e.g., 1)
      checkInterval: config.checkInterval || 3600000, // 1 hour default
      forceUpdateOnWifi: config.forceUpdateOnWifi || false,
      autoDownloadOnWifi: config.autoDownloadOnWifi || false,
      onUpdateAvailable: config.onUpdateAvailable || (() => {}),
      onUpdateProgress: config.onUpdateProgress || (() => {}),
      onUpdateComplete: config.onUpdateComplete || (() => {}),
      onUpdateError: config.onUpdateError || (() => {}),
    };

    this.versionChecker = new VersionChecker(this.config);
    this.networkMonitor = new NetworkMonitor();
    this.apkDownloader = new ApkDownloader({
      onProgress: this.handleDownloadProgress.bind(this),
      onError: this.handleUpdateError.bind(this),
      onSuccess: this.handleDownloadSuccess.bind(this),
    });
    this.bundleUpdater = new BundleUpdater({
      onProgress: this.handleDownloadProgress.bind(this),
      onError: this.handleUpdateError.bind(this),
      onSuccess: this.handleDownloadSuccess.bind(this),
    });

    this.checkIntervalId = null;
    this.isChecking = false;
    this.currentUpdate = null;
  }

  start() {
    // Start network monitoring
    this.networkMonitor.startMonitoring((isWifi, isConnected) => {
      if (isWifi && this.config.forceUpdateOnWifi) {
        this.checkForUpdates();
      }
    });

    // Initial check
    this.checkForUpdates();

    // Set up periodic checks
    this.checkIntervalId = setInterval(() => {
      if (!this.isChecking) {
        this.checkForUpdates();
      }
    }, this.config.checkInterval);
  }

  stop() {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
    this.networkMonitor.stopMonitoring();
  }

  async checkForUpdates() {
    if (this.isChecking) {
      console.log('⚠️ [OTAUpdater] Update check already in progress, skipping...');
      return;
    }

    try {
      this.isChecking = true;
      
      // Check network connectivity before making API calls
      console.log('🌐 [OTAUpdater] Checking network connectivity...');
      const isConnected = await this.networkMonitor.checkConnectionAsync();
      
      if (!isConnected) {
        console.warn('⚠️ [OTAUpdater] No internet connection. Update check skipped.');
        const networkError = new Error('No internet connection available');
        this.config.onUpdateError(networkError);
        return;
      }
      
      const isWifi = await this.networkMonitor.checkWifiAsync();
      console.log(`✅ [OTAUpdater] Network connected (WiFi: ${isWifi ? 'Yes' : 'No'})`);
      
      const currentVersion = this.versionChecker.getCurrentVersion();
      console.log('🔄 [OTAUpdater] Starting update check with version:', currentVersion);
      const result = await this.versionChecker.checkForUpdates(currentVersion);

      if (result.updateAvailable) {
        this.currentUpdate = result.update;
        this.config.onUpdateAvailable(result.update);

        // Network already checked above, but re-check for WiFi status
        const isWifi = await this.networkMonitor.checkWifiAsync();
        const isConnected = await this.networkMonitor.checkConnectionAsync();

        if (!isConnected) {
          console.warn('⚠️ [OTAUpdater] Lost internet connection. Update check skipped.');
          return;
        }
        
        console.log(`📡 [OTAUpdater] Update available: ${result.update.versionName} (${result.update.updateType})`);

        // Handle force update on WiFi
        if (this.config.forceUpdateOnWifi && isWifi && result.update.updateType === 'major') {
          await this.handleMajorUpdate(result.update, true);
        } else if (result.update.updateType === 'major') {
          // Major update - download and prompt
          await this.handleMajorUpdate(result.update, false);
        } else {
          // Minor update - download bundle
          if (isWifi && this.config.autoDownloadOnWifi) {
            await this.handleMinorUpdate(result.update);
          }
        }
      }
    } catch (error) {
      console.error('Update check error:', error);
      this.config.onUpdateError(error);
    } finally {
      this.isChecking = false;
    }
  }

  async handleMajorUpdate(update, force = false) {
    try {
      // Report status: downloading
      await this.versionChecker.reportUpdateStatus(
        'downloading',
        this.versionChecker.getCurrentVersion().versionName,
        update.versionName,
        'major'
      );

      // Download APK
      const filePath = await this.apkDownloader.downloadApk(
        update.downloadUrl,
        update.versionName
      );

      if (force) {
        this.apkDownloader.showForceUpdateAlert();
        await this.apkDownloader.installApk(filePath);
      } else {
        // Show install prompt
        this.apkDownloader.showInstallPrompt(
          filePath,
          update.versionName,
          update.releaseNotes
        );
      }

      // Report status: completed
      await this.versionChecker.reportUpdateStatus(
        'completed',
        this.versionChecker.getCurrentVersion().versionName,
        update.versionName,
        'major'
      );

      this.config.onUpdateComplete(update);
    } catch (error) {
      console.error('Major update error:', error);
      await this.versionChecker.reportUpdateStatus(
        'failed',
        this.versionChecker.getCurrentVersion().versionName,
        update.versionName,
        'major',
        error.message
      );
      this.config.onUpdateError(error);
    }
  }

  async handleMinorUpdate(update) {
    try {
      // Note: Minor updates require bundle download URL from backend
      // For now, this is a placeholder - you'll need to implement bundle serving
      
      if (!update.bundleUrl) {
        console.warn('Bundle URL not provided for minor update');
        return;
      }

      // Report status: downloading
      await this.versionChecker.reportUpdateStatus(
        'downloading',
        this.versionChecker.getCurrentVersion().versionName,
        update.versionName,
        'minor'
      );

      // Download bundle
      const bundlePath = await this.bundleUpdater.downloadBundle(
        update.bundleUrl,
        update.versionName
      );

      // Apply update
      await this.bundleUpdater.applyUpdate(bundlePath);

      // Clean up old bundles
      await this.bundleUpdater.clearOldBundles(update.versionName);

      // Report status: completed
      await this.versionChecker.reportUpdateStatus(
        'completed',
        this.versionChecker.getCurrentVersion().versionName,
        update.versionName,
        'minor'
      );

      this.config.onUpdateComplete(update);
    } catch (error) {
      console.error('Minor update error:', error);
      await this.versionChecker.reportUpdateStatus(
        'failed',
        this.versionChecker.getCurrentVersion().versionName,
        update.versionName,
        'minor',
        error.message
      );
      this.config.onUpdateError(error);
    }
  }

  handleDownloadProgress(progress, bytesWritten, contentLength) {
    this.config.onUpdateProgress({
      progress,
      bytesWritten,
      contentLength,
      type: this.currentUpdate?.updateType || 'unknown',
    });
  }

  handleDownloadSuccess(filePath) {
    console.log('Download successful:', filePath);
  }

  handleUpdateError(error) {
    this.config.onUpdateError(error);
  }

  // Manual check method
  async manualCheck() {
    await this.checkForUpdates();
  }
}

export default OTAUpdater;

