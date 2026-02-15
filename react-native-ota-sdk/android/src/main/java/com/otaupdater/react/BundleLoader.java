package com.otaupdater.react;

import android.app.Activity;

import com.facebook.react.ReactApplication;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.bridge.JSBundleLoader;
import com.facebook.react.bridge.ReactApplicationContext;

import java.lang.reflect.Field;

public class BundleLoader {

    public static void loadBundle(ReactInstanceManager instanceManager, String bundlePath, ReactApplicationContext reactContext) {
        if (instanceManager == null) {
            OTAUtils.log("ReactInstanceManager is null, cannot load bundle");
            return;
        }

        try {
            JSBundleLoader bundleLoader;
            if (bundlePath.toLowerCase().startsWith("assets://")) {
                // Use asset loader for assets:// paths
                if (reactContext != null) {
                    bundleLoader = JSBundleLoader.createAssetLoader(reactContext, bundlePath, false);
                } else {
                    OTAUtils.log("ReactApplicationContext is null, falling back to file loader");
                    bundleLoader = JSBundleLoader.createFileLoader(bundlePath);
                }
            } else {
                // Use file loader for file:// or absolute paths
                bundleLoader = JSBundleLoader.createFileLoader(bundlePath);
            }

            Field bundleLoaderField = instanceManager.getClass().getDeclaredField("mBundleLoader");
            bundleLoaderField.setAccessible(true);
            bundleLoaderField.set(instanceManager, bundleLoader);
        } catch (Exception e) {
            OTAUtils.log("Unable to set JSBundle - OTAUpdater may not support this version of React Native: " + e.getMessage());
            throw new OTAUnknownException("Could not setJSBundle", e);
        }
    }

    public static ReactInstanceManager resolveInstanceManager(Activity currentActivity) {
        if (currentActivity == null) {
            return null;
        }

        ReactApplication reactApplication = (ReactApplication) currentActivity.getApplication();
        return reactApplication.getReactNativeHost().getReactInstanceManager();
    }
}

