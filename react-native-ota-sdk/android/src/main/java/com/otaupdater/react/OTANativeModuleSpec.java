package com.otaupdater.react;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

/**
 * TurboModule spec interface for new architecture support.
 * For React Native 0.68+, this can be extended with codegen.
 * For now, we use the same implementation for both architectures.
 */
public abstract class OTANativeModuleSpec extends ReactContextBaseJavaModule {
    public OTANativeModuleSpec(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @ReactMethod
    public abstract void downloadBundle(String url, String versionName, Promise promise);

    @ReactMethod
    public abstract void installBundle(String bundlePath, Promise promise);

    @ReactMethod
    public abstract void loadBundle(String bundlePath, Promise promise);

    @ReactMethod
    public abstract void getCurrentBundle(Promise promise);

    @ReactMethod
    public abstract void clearBundles(Promise promise);

    @ReactMethod
    public abstract void getConfiguration(Promise promise);

    @ReactMethod
    public abstract void getFileProviderUri(String filePath, Promise promise);

    @ReactMethod
    public abstract void installApk(String filePath, Promise promise);
}

