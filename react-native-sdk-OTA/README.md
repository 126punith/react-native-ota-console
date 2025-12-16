# React Native OTA Updater SDK

A React Native SDK for seamless Over-The-Air (OTA) updates. Supports both major APK updates and minor JavaScript bundle updates with WiFi force-update capabilities. 

**NEW**: Now includes native Android module for true OTA bundle updates, compatible with both React Native's old architecture and new architecture (TurboModules).

## Features

- ✅ **Major Updates**: Automatic APK download and installation
- ✅ **Minor Updates**: JavaScript bundle updates without app restart
- ✅ **New Architecture Support**: Compatible with React Native TurboModules
- ✅ **Auto-Installation**: Configurable automatic APK installation
- ✅ **WiFi Control**: Force updates only on WiFi connection
- ✅ **Progress Tracking**: Real-time download progress updates
- ✅ **Error Handling**: Comprehensive error handling and reporting 

## Installation

```bash
npm install react-native-ota-updater
# or
yarn add react-native-ota-updater
```

### Native Dependencies

This SDK includes a native Android module for bundle updates. Additional dependencies:

```bash
npm install react-native-fs @react-native-community/netinfo react-native-install-apk
```

**Note**: The native Android module is automatically linked via React Native's autolinking feature. See [ANDROID_SETUP.md](./ANDROID_SETUP.md) for manual setup instructions if needed.

### Android Setup

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<!-- For file downloads -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />

<!-- For APK installation -->
<uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />
```

Add to `android/app/build.gradle`:

```gradle
android {
    ...
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }
}
```

### iOS Setup

iOS support is limited (APK installation is Android-only). For bundle updates on iOS, you'll need additional native module configuration.

## Usage

### Basic Setup

```javascript
import React, { useEffect } from 'react';
import { OTAUpdater } from 'react-native-ota-updater';

function App() {
  useEffect(() => {
    const updater = new OTAUpdater({
      apiUrl: 'https://your-server.com/api',
      appId: 'com.example.myapp',
      apiKey: 'your-api-key', // Optional but recommended
      forceUpdateOnWifi: true,
      autoDownloadOnWifi: true,
      checkInterval: 3600000, // Check every hour (default)
      
      // Callbacks
      onUpdateAvailable: (update) => {
        console.log('New update available:', update.versionName);
      },
      onUpdateProgress: (progress) => {
        console.log(`Download: ${progress.progress}%`);
      },
      onUpdateComplete: (update) => {
        console.log('Update completed:', update.versionName);
      },
      onUpdateError: (error) => {
        console.error('Update error:', error);
      }
    });

    // Start checking for updates
    updater.start();

    // Cleanup on unmount
    return () => {
      updater.stop();
    };
  }, []);

  return (
    // Your app components
  );
}
```

### Manual Update Check

```javascript
const updater = new OTAUpdater(config);

// Check for updates manually
await updater.manualCheck();
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiUrl` | string | required | Backend API URL |
| `appId` | string | required | Your app's unique identifier |
| `apiKey` | string | optional | API key for authentication |
| `deviceId` | string | auto | Device identifier |
| `currentVersionName` | string | required | Current app version name (e.g., "1.0.0") |
| `currentVersionCode` | number | required | Current app version code (e.g., 1) |
| `checkInterval` | number | 3600000 | Update check interval (ms) |
| `forceUpdateOnWifi` | boolean | false | Force update when WiFi available |
| `autoDownloadOnWifi` | boolean | false | Auto-download on WiFi |
| `autoInstallApk` | boolean | true | Automatically install APK after download (default: true) |
| `autoInstallOnWifi` | boolean | false | Only auto-install when connected to WiFi |
| `onUpdateAvailable` | function | - | Called when update is available |
| `onUpdateProgress` | function | - | Called during download |
| `onUpdateComplete` | function | - | Called when update completes |
| `onUpdateError` | function | - | Called on errors |

### Update Types

#### Major Updates (APK)
- Full APK installation required
- Auto-installs by default (can be disabled with `autoInstallApk: false`)
- Can be forced on WiFi
- Requires Android install permissions

#### Minor Updates (Bundle)
- JavaScript bundle update only
- Can be applied without full app restart
- Requires native module support
- Faster and less intrusive

### WiFi Force Update

When `forceUpdateOnWifi: true`:
- Automatically checks when WiFi connects
- Forces major updates immediately
- Downloads and installs without user prompt
- Ideal for internal/critical updates

### Auto-Install APK

When `autoInstallApk: true` (default):
- APK automatically installs after download completes
- No user prompt required (aggressive mode)
- Installation starts immediately after download
- Ideal for custom console/internal apps

When `autoInstallOnWifi: true`:
- Auto-install only occurs when connected to WiFi
- Falls back to install prompt if not on WiFi
- Useful for conserving mobile data

### Example: Custom Update Handler

```javascript
const updater = new OTAUpdater({
  apiUrl: 'https://your-server.com/api',
  appId: 'com.example.myapp',
  forceUpdateOnWifi: true,
  onUpdateAvailable: async (update) => {
    if (update.updateType === 'major') {
      // Show custom UI for major updates
      Alert.alert(
        'Major Update Available',
        `Version ${update.versionName} is available.\n\n${update.releaseNotes}`,
        [
          { text: 'Update Now', onPress: () => updater.manualCheck() },
          { text: 'Later', style: 'cancel' }
        ]
      );
    }
  }
});
```

## Advanced Usage

### Version Checker (Standalone)

```javascript
import { VersionChecker } from 'react-native-ota-updater';

const checker = new VersionChecker({
  apiUrl: 'https://your-server.com/api',
  appId: 'com.example.myapp',
  apiKey: 'your-api-key'
});

const result = await checker.checkForUpdates();
if (result.updateAvailable) {
  console.log('Update:', result.update);
}
```

### Network Monitor (Standalone)

```javascript
import { NetworkMonitor } from 'react-native-ota-updater';

const monitor = new NetworkMonitor();
monitor.startMonitoring((isWifi, isConnected) => {
  console.log('WiFi:', isWifi, 'Connected:', isConnected);
});

// Check WiFi status
const isWifi = await monitor.checkWifiAsync();
```

## Troubleshooting

### APK Installation Fails
- Ensure `REQUEST_INSTALL_PACKAGES` permission is granted
- Check if device allows installation from unknown sources
- Verify APK file integrity

### Bundle Updates Not Applying
- **Native module is now included!** The SDK includes a native Android module for bundle updates
- Ensure the native module is properly linked (see [ANDROID_SETUP.md](./ANDROID_SETUP.md))
- Check that bundle file name matches `index.android.bundle` (or your configured name)
- Verify bundle path is correct in downloaded package
- Check logs: `adb logcat | grep OTAUpdater`

### Update Checks Not Working
- Verify API URL is correct and accessible
- Check appId matches backend configuration
- Ensure API key is valid (if required)
- Check network connectivity

## Security Notes

- Use HTTPS for API communication
- Validate API responses
- Implement certificate pinning for production
- Never store sensitive data in app code
- Use secure storage for API keys

## License

ISC

