import { NativeModules, Platform } from 'react-native';

const { OTANative } = NativeModules;

class NativeBundleManager {
  constructor() {
    this.isAvailable = OTANative != null;
  }

  async downloadBundle(url, versionName) {
    if (!this.isAvailable) {
      throw new Error('OTANative module is not available');
    }
    return await OTANative.downloadBundle(url, versionName);
  }

  async installBundle(bundlePath) {
    if (!this.isAvailable) {
      throw new Error('OTANative module is not available');
    }
    return await OTANative.installBundle(bundlePath);
  }

  async loadBundle(bundlePath) {
    if (!this.isAvailable) {
      throw new Error('OTANative module is not available');
    }
    return await OTANative.loadBundle(bundlePath);
  }

  async getCurrentBundle() {
    if (!this.isAvailable) {
      return null;
    }
    return await OTANative.getCurrentBundle();
  }

  async clearBundles() {
    if (!this.isAvailable) {
      throw new Error('OTANative module is not available');
    }
    return await OTANative.clearBundles();
  }

  async getConfiguration() {
    if (!this.isAvailable) {
      return null;
    }
    return await OTANative.getConfiguration();
  }
}

export default new NativeBundleManager();

