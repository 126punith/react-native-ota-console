# Android Native Module Setup

This SDK includes a native Android module that enables true OTA bundle updates. The module supports both React Native's old architecture and new architecture (TurboModules).

## Automatic Setup (Recommended)

The module uses React Native's autolinking feature. If you're using React Native 0.60+, the module should be automatically linked.

### 1. Install the SDK

```bash
npm install react-native-ota-updater
# or
yarn add react-native-ota-updater
```

### 2. Rebuild the Android App

```bash
cd android
./gradlew clean
cd ..
npx react-native run-android
```

## Manual Setup (If Autolinking Fails)

If autolinking doesn't work, you can manually link the module:

### 1. Add to `android/settings.gradle`

```gradle
include ':react-native-ota-updater'
project(':react-native-ota-updater').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-ota-updater/android')
```

### 2. Add to `android/app/build.gradle`

```gradle
dependencies {
    ...
    implementation project(':react-native-ota-updater')
}
```

### 3. Register Package in `MainApplication.java`

```java
import com.otaupdater.react.OTAPackage;

public class MainApplication extends Application implements ReactApplication {
    // ...
    
    @Override
    protected List<ReactPackage> getPackages() {
        @SuppressWarnings("UnnecessaryLocalVariable")
        List<ReactPackage> packages = new PackageList(this).getPackages();
        packages.add(new OTAPackage()); // Add this line
        return packages;
    }
}
```

## Permissions

The module requires internet permission, which should already be in your `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
```

## Usage

The native module is automatically used when available. The JavaScript SDK will fall back to file-based updates if the native module is not available.

```javascript
import { OTAUpdater } from 'react-native-ota-updater';

// The native module is used automatically for bundle updates
const updater = new OTAUpdater({
  apiUrl: 'https://your-api.com',
  appId: 'your-app-id',
  // ... other config
});
```

## Troubleshooting

### Module Not Found

If you get "OTANative module is not available":
1. Make sure you've rebuilt the app after installing
2. Check that `OTAPackage` is registered in `MainApplication.java`
3. Verify the module is in `node_modules/react-native-ota-updater/android`

### Bundle Not Loading

If bundles download but don't load:
1. Check that the bundle file name matches `index.android.bundle` (or your configured name)
2. Verify the bundle path is correct
3. Check logs for errors: `adb logcat | grep OTAUpdater`

## New Architecture Support

The module is designed to work with both old and new React Native architectures. For React Native 0.76+ with new architecture enabled, the module will work seamlessly. No additional configuration is needed.

