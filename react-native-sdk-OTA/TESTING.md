# Testing the Native OTA Module on Android Simulator

This guide will help you test the native OTA bundle update functionality on an Android emulator.

## Prerequisites

1. **Android Studio** installed with Android SDK
2. **Android Emulator** set up (API 21+ recommended)
3. **React Native development environment** configured
4. **Backend server** running (for serving bundles)

## Step 1: Set Up Test React Native App

### Create a Test App (if you don't have one)

```bash
npx react-native init TestOTAApp
cd TestOTAApp
```

### Install the OTA SDK

```bash
# If using local path
npm install ../react-native-sdk-OTA

# Or if published
npm install react-native-ota-updater
```

### Link Native Module

The module should auto-link, but verify:

```bash
cd android
./gradlew clean
cd ..
```

## Step 2: Configure Your Test App

### Update `MainApplication.java`

Ensure the package is registered:

```java
import com.otaupdater.react.OTAPackage;

// In getPackages() method:
packages.add(new OTAPackage());
```

### Update `AndroidManifest.xml`

Ensure permissions are set:

```xml
<uses-permission android:name="android.permission.INTERNET" />
```

### Create Test Component

Create `App.js`:

```javascript
import React, { useEffect, useState } from 'react';
import { View, Text, Button, ScrollView, StyleSheet } from 'react-native';
import { OTAUpdater } from 'react-native-ota-updater';
import NativeBundleManager from 'react-native-ota-updater/src/NativeBundleManager';

export default function App() {
  const [logs, setLogs] = useState([]);
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    // Check if native module is available
    setIsAvailable(NativeBundleManager.isAvailable);
    addLog('Native module available: ' + NativeBundleManager.isAvailable);
  }, []);

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(message);
  };

  const testDownload = async () => {
    try {
      addLog('Starting bundle download test...');
      // Replace with your actual bundle URL
      const bundleUrl = 'http://10.0.2.2:3001/api/bundles/test.bundle';
      const versionName = '1.0.1';
      
      const result = await NativeBundleManager.downloadBundle(bundleUrl, versionName);
      addLog('Download successful: ' + JSON.stringify(result));
    } catch (error) {
      addLog('Download error: ' + error.message);
    }
  };

  const testGetCurrent = async () => {
    try {
      const bundle = await NativeBundleManager.getCurrentBundle();
      addLog('Current bundle: ' + JSON.stringify(bundle));
    } catch (error) {
      addLog('Get current error: ' + error.message);
    }
  };

  const testGetConfig = async () => {
    try {
      const config = await NativeBundleManager.getConfiguration();
      addLog('Configuration: ' + JSON.stringify(config));
    } catch (error) {
      addLog('Config error: ' + error.message);
    }
  };

  const testClearBundles = async () => {
    try {
      await NativeBundleManager.clearBundles();
      addLog('Bundles cleared successfully');
    } catch (error) {
      addLog('Clear error: ' + error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>OTA Native Module Test</Text>
      <Text style={styles.status}>
        Native Module: {isAvailable ? '✅ Available' : '❌ Not Available'}
      </Text>
      
      <View style={styles.buttonContainer}>
        <Button title="Test Download" onPress={testDownload} />
        <Button title="Get Current Bundle" onPress={testGetCurrent} />
        <Button title="Get Configuration" onPress={testGetConfig} />
        <Button title="Clear Bundles" onPress={testClearBundles} />
      </View>

      <ScrollView style={styles.logContainer}>
        {logs.map((log, index) => (
          <Text key={index} style={styles.log}>{log}</Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  status: {
    fontSize: 16,
    marginBottom: 20,
  },
  buttonContainer: {
    gap: 10,
    marginBottom: 20,
  },
  logContainer: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 5,
  },
  log: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 5,
  },
});
```

## Step 3: Set Up Backend for Testing

### Option 1: Use Your Existing Backend

Ensure your backend is running and accessible from the emulator:

```bash
cd backend
npm start
```

**Important**: Use `10.0.2.2` instead of `localhost` in the emulator to access your host machine.

### Option 2: Create Simple Test Server

Create `test-server.js`:

```javascript
const express = require('express');
const app = express();
const path = require('path');

app.use(express.static('test-bundles'));

// Serve a test bundle
app.get('/api/bundles/test.bundle', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-bundles', 'test.bundle'));
});

app.listen(3001, () => {
  console.log('Test server running on http://localhost:3001');
});
```

Create a simple test bundle file `test-bundles/test.bundle`:

```javascript
// Simple test bundle
console.log('Test bundle loaded!');
```

## Step 4: Build and Run on Emulator

### Start Android Emulator

```bash
# List available emulators
emulator -list-avds

# Start an emulator
emulator -avd <emulator-name>
```

### Build and Install App

```bash
# Clean build
cd android
./gradlew clean
cd ..

# Run on emulator
npx react-native run-android
```

## Step 5: Test Native Module Functions

### Test 1: Check Module Availability

1. Open the app
2. Check if "Native Module: ✅ Available" is shown
3. If not available, check logs: `adb logcat | grep OTAUpdater`

### Test 2: Download Bundle

1. Click "Test Download" button
2. Watch logs for download progress
3. Check logs: `adb logcat | grep OTAUpdater`

Expected logs:
```
[OTAUpdater] Starting bundle download...
[OTAUpdater] Download progress: X%
[OTAUpdater] Download successful
```

### Test 3: Get Current Bundle

1. After downloading, click "Get Current Bundle"
2. Should show bundle metadata

### Test 4: Get Configuration

1. Click "Get Configuration"
2. Should show app version and bundle file name

### Test 5: Clear Bundles

1. Click "Clear Bundles"
2. Then try "Get Current Bundle" - should return null

## Step 6: Test Bundle Loading

### Create a Test Bundle with Different Content

Create `test-bundles/test-v2.bundle`:

```javascript
console.log('Test bundle V2 loaded! This is an update!');
```

### Test Full Update Flow

1. Download bundle V1
2. Install bundle V1
3. Load bundle V1 (app should reload)
4. Download bundle V2
5. Install bundle V2
6. Load bundle V2 (app should reload with new content)

## Step 7: Monitor Logs

### View All Logs

```bash
adb logcat | grep -E "(OTAUpdater|ReactNative)"
```

### View Native Module Logs Only

```bash
adb logcat -s ReactNative:V OTAUpdater:*
```

### Clear Logs

```bash
adb logcat -c
```

## Step 8: Test Error Scenarios

### Test Invalid URL

```javascript
await NativeBundleManager.downloadBundle('http://invalid-url.com/bundle.bundle', '1.0.0');
// Should show error in logs
```

### Test Network Failure

1. Turn off WiFi/data on emulator
2. Try downloading bundle
3. Should handle error gracefully

### Test Invalid Bundle Path

```javascript
await NativeBundleManager.loadBundle('/invalid/path/bundle.bundle');
// Should show error
```

## Troubleshooting

### Module Not Found

**Error**: `OTANative module is not available`

**Solutions**:
1. Rebuild the app: `cd android && ./gradlew clean && cd .. && npx react-native run-android`
2. Check `MainApplication.java` has `new OTAPackage()`
3. Verify module exists: `ls android/app/src/main/java/com/otaupdater/react/`

### Build Errors

**Error**: `package com.otaupdater.react does not exist`

**Solutions**:
1. Clean build: `cd android && ./gradlew clean`
2. Invalidate caches in Android Studio
3. Rebuild: `npx react-native run-android`

### Bundle Not Loading

**Error**: Bundle downloads but doesn't load

**Solutions**:
1. Check bundle path is correct
2. Verify bundle file name matches `index.android.bundle`
3. Check logs for specific error: `adb logcat | grep BundleLoader`

### Network Issues

**Error**: Cannot connect to server

**Solutions**:
1. Use `10.0.2.2` instead of `localhost` for emulator
2. Check firewall settings
3. Verify server is running: `curl http://10.0.2.2:3001/api/bundles/test.bundle`

## Advanced Testing

### Test with Real Bundle

1. Build a production bundle:
```bash
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output test.bundle
```

2. Upload to your backend
3. Download via native module
4. Test loading

### Test Progress Callbacks

Monitor download progress events:

```javascript
import { DeviceEventEmitter } from 'react-native';

DeviceEventEmitter.addListener('OTADownloadProgress', (progress) => {
  console.log('Progress:', progress.receivedBytes, '/', progress.totalBytes);
});
```

### Test Multiple Versions

1. Download version 1.0.0
2. Install and load
3. Download version 1.0.1
4. Install and load
5. Verify version 1.0.1 is current
6. Test rollback (if implemented)

## Verification Checklist

- [ ] Native module is detected
- [ ] Bundle download works
- [ ] Download progress events fire
- [ ] Bundle installation works
- [ ] Bundle loading works (app reloads)
- [ ] Current bundle info is correct
- [ ] Configuration is correct
- [ ] Clear bundles works
- [ ] Error handling works
- [ ] Logs are informative

## Next Steps

Once basic testing passes:
1. Test with your actual backend API
2. Test with production bundles
3. Test update flow end-to-end
4. Test error recovery
5. Test on physical device


