import { Platform } from 'react-native';
import { NativeModules } from 'react-native';

class VersionChecker {
  constructor(config) {
    this.apiUrl = config.apiUrl;
    this.appId = config.appId;
    this.apiKey = config.apiKey;
    this.deviceId = config.deviceId || this.getDeviceId();
    // Allow app to pass version explicitly (recommended)
    this.currentVersionName = config.currentVersionName;
    this.currentVersionCode = config.currentVersionCode;
  }

  getDeviceId() {
    // Generate or retrieve device ID
    // In a real implementation, you might use a library like react-native-device-info
    return Platform.OS === 'android' 
      ? NativeModules.PlatformConstants?.Fingerprint || 'unknown'
      : 'unknown';
  }

  getCurrentVersion() {
    // Priority 1: Use version passed explicitly in config (most reliable)
    if (this.currentVersionName && this.currentVersionCode) {
      console.log('📱 [VersionChecker] Using version from config:', {
        versionName: this.currentVersionName,
        versionCode: this.currentVersionCode
      });
      return {
        versionName: this.currentVersionName,
        versionCode: parseInt(this.currentVersionCode)
      };
    }
    
    // Priority 2: Try NativeModules.OTAUpdater if available (native module)
    try {
      if (NativeModules.OTAUpdater?.getVersionName && NativeModules.OTAUpdater?.getVersionCode) {
        const versionName = NativeModules.OTAUpdater.getVersionName();
        const versionCode = NativeModules.OTAUpdater.getVersionCode();
        if (versionName && versionCode) {
          console.log('📱 [VersionChecker] Using version from NativeModules.OTAUpdater:', {
            versionName,
            versionCode
          });
          return {
            versionName,
            versionCode: parseInt(versionCode)
          };
        }
      }
    } catch (error) {
      console.warn('⚠️ [VersionChecker] Could not read version from NativeModules.OTAUpdater:', error);
    }
    
    // Priority 3: Try react-native-device-info if available
    try {
      const DeviceInfo = require('react-native-device-info');
      if (DeviceInfo.getVersion && DeviceInfo.getBuildNumber) {
        const versionName = DeviceInfo.getVersion();
        const buildNumber = DeviceInfo.getBuildNumber();
        if (versionName) {
          console.log('📱 [VersionChecker] Using version from react-native-device-info:', {
            versionName,
            versionCode: parseInt(buildNumber) || 1
          });
          return {
            versionName,
            versionCode: parseInt(buildNumber) || 1
          };
        }
      }
    } catch (error) {
      console.warn('⚠️ [VersionChecker] react-native-device-info not available:', error);
    }
    
    // Final fallback - defaults
    // NOTE: App should pass version explicitly in OTAUpdater config for reliability
    console.warn('⚠️ [VersionChecker] Using default version (1.0.0, code: 1). Please pass version explicitly in config.');
    return {
      versionName: '1.0.0',
      versionCode: 1
    };
  }

  async checkForUpdates(currentVersion = null) {
    try {
      const version = currentVersion || this.getCurrentVersion();
      
      const params = new URLSearchParams({
        currentVersion: version.versionName,
        currentVersionCode: version.versionCode.toString(),
        appId: this.appId,
        deviceId: this.deviceId
      });

      const headers = {
        'Content-Type': 'application/json',
        'X-App-Id': this.appId
      };

      if (this.apiKey) {
        headers['X-API-Key'] = this.apiKey;
      }

      const requestUrl = `${this.apiUrl}/updates/check?${params.toString()}`;
      console.log('🔄 [VersionChecker] Checking for updates...');
      console.log('📡 [VersionChecker] Request URL:', requestUrl);
      console.log('📡 [VersionChecker] Request headers:', JSON.stringify(headers, null, 2));
      console.log('📱 [VersionChecker] Current version:', JSON.stringify(version, null, 2));

      const response = await fetch(requestUrl, {
        method: 'GET',
        headers
      });

      console.log('📡 [VersionChecker] Response status:', response.status);
      console.log('📡 [VersionChecker] Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [VersionChecker] Update check failed:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText
        });
        throw new Error(`Update check failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ [VersionChecker] Update check successful:', JSON.stringify(data, null, 2));
      return data;
    } catch (error) {
      console.error('❌ [VersionChecker] Error checking for updates:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        apiUrl: this.apiUrl,
        appId: this.appId
      });
      
      // Provide more helpful error messages
      if (error.message.includes('Network request failed') || error.message.includes('Failed to fetch')) {
        const networkError = new Error(
          `Cannot connect to update server at ${this.apiUrl}. ` +
          `Please check: 1) Server is running, 2) Network connection, 3) URL is correct`
        );
        networkError.originalError = error;
        throw networkError;
      }
      
      throw error;
    }
  }

  async reportUpdateStatus(status, fromVersion, toVersion, updateType, errorMessage = null) {
    try {
      const headers = {
        'Content-Type': 'application/json',
        'X-App-Id': this.appId
      };

      if (this.apiKey) {
        headers['X-API-Key'] = this.apiKey;
      }

      const requestUrl = `${this.apiUrl}/updates/report?deviceId=${this.deviceId}`;
      const requestBody = {
        status,
        fromVersion,
        toVersion,
        updateType,
        errorMessage
      };

      console.log('📊 [VersionChecker] Reporting update status...');
      console.log('📡 [VersionChecker] Request URL:', requestUrl);
      console.log('📡 [VersionChecker] Request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(requestUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      console.log('📡 [VersionChecker] Status report response:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [VersionChecker] Status report failed:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText
        });
        throw new Error(`Status report failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ [VersionChecker] Status report successful');
      return data;
    } catch (error) {
      console.error('❌ [VersionChecker] Error reporting update status:', {
        message: error.message,
        name: error.name,
        apiUrl: this.apiUrl
      });
      // Don't throw - status reporting is not critical
    }
  }
}

export default VersionChecker;

