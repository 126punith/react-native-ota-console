package com.otaupdater.react;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.AsyncTask;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;

import androidx.core.content.FileProvider;

import com.facebook.react.ReactApplication;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import org.json.JSONObject;

import java.io.File;

public class OTANativeModuleImpl extends OTANativeModuleSpec {
    private BundleManager mBundleManager;
    private SettingsManager mSettingsManager;
    private String mAppVersion;
    private String mBundleFileName;

    public OTANativeModuleImpl(ReactApplicationContext reactContext) {
        super(reactContext);
        
        String documentsDirectory = reactContext.getFilesDir().getAbsolutePath();
        mBundleManager = new BundleManager(documentsDirectory);
        mSettingsManager = new SettingsManager(reactContext.getApplicationContext());
        
        try {
            PackageInfo pInfo = reactContext.getPackageManager().getPackageInfo(reactContext.getPackageName(), 0);
            mAppVersion = pInfo.versionName;
        } catch (PackageManager.NameNotFoundException e) {
            mAppVersion = "unknown";
        }
        
        mBundleFileName = OTAConstants.DEFAULT_JS_BUNDLE_NAME;
    }

    @Override
    public String getName() {
        return "OTANative";
    }

    @Override
    public void downloadBundle(String url, String versionName, Promise promise) {
        AsyncTask<Void, Void, Void> asyncTask = new AsyncTask<Void, Void, Void>() {
            @Override
            protected Void doInBackground(Void... params) {
                try {
                    JSONObject updatePackage = new JSONObject();
                    OTAUtils.setJSONValueForKey(updatePackage, OTAConstants.DOWNLOAD_URL_KEY, url);
                    OTAUtils.setJSONValueForKey(updatePackage, OTAConstants.VERSION_NAME_KEY, versionName);
                    
                    String packageHash = String.valueOf(versionName.hashCode());
                    OTAUtils.setJSONValueForKey(updatePackage, OTAConstants.PACKAGE_HASH_KEY, packageHash);
                    
                    mBundleManager.downloadPackage(updatePackage, mBundleFileName, new DownloadProgressCallback() {
                        @Override
                        public void call(DownloadProgress downloadProgress) {
                            getReactApplicationContext()
                                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                                    .emit(OTAConstants.DOWNLOAD_PROGRESS_EVENT_NAME, downloadProgress.createWritableMap());
                        }
                    });
                    
                    JSONObject downloadedPackage = mBundleManager.getPackage(packageHash);
                    promise.resolve(OTAUtils.convertJsonObjectToWritable(downloadedPackage));
                } catch (Exception e) {
                    OTAUtils.log(e);
                    promise.reject("DOWNLOAD_ERROR", e.getMessage(), e);
                }
                return null;
            }
        };
        asyncTask.executeOnExecutor(AsyncTask.THREAD_POOL_EXECUTOR);
    }

    @Override
    public void installBundle(String bundlePath, Promise promise) {
        AsyncTask<Void, Void, Void> asyncTask = new AsyncTask<Void, Void, Void>() {
            @Override
            protected Void doInBackground(Void... params) {
                try {
                    String packageHash = extractPackageHashFromPath(bundlePath);
                    if (packageHash == null) {
                        throw new OTAInvalidUpdateException("Invalid bundle path: " + bundlePath);
                    }
                    
                    JSONObject packageInfo = mBundleManager.getPackage(packageHash);
                    if (packageInfo == null) {
                        throw new OTAInvalidUpdateException("Package not found for hash: " + packageHash);
                    }
                    
                    mBundleManager.installPackage(packageInfo, false);
                    mSettingsManager.savePendingUpdate(packageHash, false);
                    
                    promise.resolve(null);
                } catch (Exception e) {
                    OTAUtils.log(e);
                    promise.reject("INSTALL_ERROR", e.getMessage(), e);
                }
                return null;
            }
        };
        asyncTask.executeOnExecutor(AsyncTask.THREAD_POOL_EXECUTOR);
    }

    @Override
    public void loadBundle(String bundlePath, Promise promise) {
        try {
            final Activity currentActivity = getCurrentActivity();
            if (currentActivity == null) {
                promise.reject("LOAD_ERROR", "Current activity is null");
                return;
            }

            new Handler(Looper.getMainLooper()).post(new Runnable() {
                @Override
                public void run() {
                    try {
                        ReactInstanceManager instanceManager = BundleLoader.resolveInstanceManager(currentActivity);
                        if (instanceManager == null) {
                            promise.reject("LOAD_ERROR", "ReactInstanceManager is null");
                            return;
                        }

                        BundleLoader.loadBundle(instanceManager, bundlePath, getReactApplicationContext());
                        instanceManager.recreateReactContextInBackground();
                        
                        promise.resolve(null);
                    } catch (Exception e) {
                        OTAUtils.log(e);
                        promise.reject("LOAD_ERROR", e.getMessage(), e);
                    }
                }
            });
        } catch (Exception e) {
            OTAUtils.log(e);
            promise.reject("LOAD_ERROR", e.getMessage(), e);
        }
    }

    @Override
    public void getCurrentBundle(Promise promise) {
        AsyncTask<Void, Void, Void> asyncTask = new AsyncTask<Void, Void, Void>() {
            @Override
            protected Void doInBackground(Void... params) {
                try {
                    JSONObject currentPackage = mBundleManager.getCurrentPackage();
                    if (currentPackage != null) {
                        promise.resolve(OTAUtils.convertJsonObjectToWritable(currentPackage));
                    } else {
                        promise.resolve(null);
                    }
                } catch (Exception e) {
                    OTAUtils.log(e);
                    promise.reject("GET_BUNDLE_ERROR", e.getMessage(), e);
                }
                return null;
            }
        };
        asyncTask.executeOnExecutor(AsyncTask.THREAD_POOL_EXECUTOR);
    }

    @Override
    public void clearBundles(Promise promise) {
        AsyncTask<Void, Void, Void> asyncTask = new AsyncTask<Void, Void, Void>() {
            @Override
            protected Void doInBackground(Void... params) {
                try {
                    mBundleManager.clearUpdates();
                    promise.resolve(null);
                } catch (Exception e) {
                    OTAUtils.log(e);
                    promise.reject("CLEAR_ERROR", e.getMessage(), e);
                }
                return null;
            }
        };
        asyncTask.executeOnExecutor(AsyncTask.THREAD_POOL_EXECUTOR);
    }

    @Override
    public void getConfiguration(Promise promise) {
        try {
            WritableMap configMap = Arguments.createMap();
            configMap.putString("appVersion", mAppVersion);
            configMap.putString("bundleFileName", mBundleFileName);
            promise.resolve(configMap);
        } catch (Exception e) {
            OTAUtils.log(e);
            promise.reject("CONFIG_ERROR", e.getMessage(), e);
        }
    }

    @Override
    public void getFileProviderUri(String filePath, Promise promise) {
        try {
            ReactApplicationContext context = getReactApplicationContext();
            File file = new File(filePath);
            
            Uri uri = FileProvider.getUriForFile(
                context,
                context.getPackageName() + ".ota.fileprovider",
                file
            );
            
            promise.resolve(uri.toString());
        } catch (Exception e) {
            OTAUtils.log(e);
            promise.reject("FILE_PROVIDER_ERROR", e.getMessage(), e);
        }
    }

    @Override
    public void installApk(String filePath, Promise promise) {
        try {
            OTAUtils.log("📦 [OTANativeModuleImpl] installApk called with path: " + filePath);
            ReactApplicationContext context = getReactApplicationContext();
            Activity currentActivity = getCurrentActivity();
            
            if (currentActivity == null) {
                OTAUtils.log("❌ [OTANativeModuleImpl] No current activity available");
                promise.reject("NO_ACTIVITY", "No current activity available");
                return;
            }

            File file = new File(filePath);
            OTAUtils.log("📦 [OTANativeModuleImpl] File exists: " + file.exists() + ", absolute path: " + file.getAbsolutePath());
            if (!file.exists()) {
                promise.reject("FILE_NOT_FOUND", "APK file not found: " + filePath);
                return;
            }

            Uri apkUri;
            String providerAuthority = context.getPackageName() + ".ota.fileprovider";
            OTAUtils.log("📦 [OTANativeModuleImpl] Provider authority: " + providerAuthority);
            OTAUtils.log("📦 [OTANativeModuleImpl] Android SDK version: " + Build.VERSION.SDK_INT);
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                // Android 7.0+ requires FileProvider
                try {
                    apkUri = FileProvider.getUriForFile(
                        context,
                        providerAuthority,
                        file
                    );
                    OTAUtils.log("✅ [OTANativeModuleImpl] FileProvider URI generated: " + apkUri.toString());
                } catch (IllegalArgumentException e) {
                    OTAUtils.log("❌ [OTANativeModuleImpl] FileProvider error: " + e.getMessage());
                    OTAUtils.log("❌ [OTANativeModuleImpl] File path: " + filePath);
                    OTAUtils.log("❌ [OTANativeModuleImpl] File absolute path: " + file.getAbsolutePath());
                    throw e;
                }
            } else {
                // Android 6.0 and below can use file:// URI
                apkUri = Uri.fromFile(file);
                OTAUtils.log("✅ [OTANativeModuleImpl] Using file:// URI: " + apkUri.toString());
            }

            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            
            // Grant read permission to the package installer
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            }

            OTAUtils.log("🚀 [OTANativeModuleImpl] Starting installation intent");
            currentActivity.startActivity(intent);
            OTAUtils.log("✅ [OTANativeModuleImpl] Installation intent started successfully");
            promise.resolve(true);
        } catch (Exception e) {
            OTAUtils.log("❌ [OTANativeModuleImpl] Installation error: " + e.getMessage());
            OTAUtils.log(e);
            promise.reject("INSTALL_ERROR", e.getMessage(), e);
        }
    }

    private String extractPackageHashFromPath(String bundlePath) {
        if (bundlePath == null) {
            return null;
        }
        
        String[] parts = bundlePath.split("/");
        for (int i = 0; i < parts.length; i++) {
            if (parts[i].equals(OTAConstants.CODE_PUSH_FOLDER_PREFIX) && i + 1 < parts.length) {
                return parts[i + 1];
            }
        }
        
        return null;
    }
}

