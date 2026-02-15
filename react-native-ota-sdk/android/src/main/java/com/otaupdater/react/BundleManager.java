package com.otaupdater.react;

import android.os.Build;

import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.URL;
import java.nio.ByteBuffer;

import javax.net.ssl.HttpsURLConnection;

public class BundleManager {

    private String mDocumentsDirectory;
    private String mBundleFileName;

    public BundleManager(String documentsDirectory) {
        this(documentsDirectory, OTAConstants.DEFAULT_JS_BUNDLE_NAME);
    }

    public BundleManager(String documentsDirectory, String bundleFileName) {
        mDocumentsDirectory = documentsDirectory;
        mBundleFileName = bundleFileName;
    }

    private String getDownloadFilePath() {
        return OTAUtils.appendPathComponent(getOTAPath(), OTAConstants.DOWNLOAD_FILE_NAME);
    }

    private String getUnzippedFolderPath() {
        return OTAUtils.appendPathComponent(getOTAPath(), OTAConstants.UNZIPPED_FOLDER_NAME);
    }

    private String getDocumentsDirectory() {
        return mDocumentsDirectory;
    }

    private String getOTAPath() {
        return OTAUtils.appendPathComponent(getDocumentsDirectory(), OTAConstants.CODE_PUSH_FOLDER_PREFIX);
    }

    private String getStatusFilePath() {
        return OTAUtils.appendPathComponent(getOTAPath(), OTAConstants.STATUS_FILE);
    }

    public JSONObject getCurrentPackageInfo() {
        String statusFilePath = getStatusFilePath();
        if (!FileUtils.fileAtPathExists(statusFilePath)) {
            return new JSONObject();
        }

        try {
            return OTAUtils.getJsonObjectFromFile(statusFilePath);
        } catch (IOException e) {
            throw new OTAUnknownException("Error getting current package info", e);
        }
    }

    public void updateCurrentPackageInfo(JSONObject packageInfo) {
        try {
            OTAUtils.writeJsonToFile(packageInfo, getStatusFilePath());
        } catch (IOException e) {
            throw new OTAUnknownException("Error updating current package info", e);
        }
    }

    public String getCurrentPackageFolderPath() {
        JSONObject info = getCurrentPackageInfo();
        String packageHash = info.optString(OTAConstants.CURRENT_PACKAGE_KEY, null);
        if (packageHash == null) {
            return null;
        }

        return getPackageFolderPath(packageHash);
    }

    public String getCurrentPackageBundlePath(String bundleFileName) {
        String packageFolder = getCurrentPackageFolderPath();
        if (packageFolder == null) {
            return null;
        }

        JSONObject currentPackage = getCurrentPackage();
        if (currentPackage == null) {
            return null;
        }

        String relativeBundlePath = currentPackage.optString(OTAConstants.RELATIVE_BUNDLE_PATH_KEY, null);
        if (relativeBundlePath == null) {
            return OTAUtils.appendPathComponent(packageFolder, bundleFileName);
        } else {
            return OTAUtils.appendPathComponent(packageFolder, relativeBundlePath);
        }
    }

    public String getPackageFolderPath(String packageHash) {
        return OTAUtils.appendPathComponent(getOTAPath(), packageHash);
    }

    public String getCurrentPackageHash() {
        JSONObject info = getCurrentPackageInfo();
        return info.optString(OTAConstants.CURRENT_PACKAGE_KEY, null);
    }

    public String getPreviousPackageHash() {
        JSONObject info = getCurrentPackageInfo();
        return info.optString(OTAConstants.PREVIOUS_PACKAGE_KEY, null);
    }

    public JSONObject getCurrentPackage() {
        String packageHash = getCurrentPackageHash();
        if (packageHash == null) {
            return null;
        }

        return getPackage(packageHash);
    }

    public JSONObject getPreviousPackage() {
        String packageHash = getPreviousPackageHash();
        if (packageHash == null) {
            return null;
        }

        return getPackage(packageHash);
    }

    public JSONObject getPackage(String packageHash) {
        String folderPath = getPackageFolderPath(packageHash);
        String packageFilePath = OTAUtils.appendPathComponent(folderPath, OTAConstants.PACKAGE_FILE_NAME);
        try {
            return OTAUtils.getJsonObjectFromFile(packageFilePath);
        } catch (IOException e) {
            return null;
        }
    }

    public void downloadPackage(JSONObject updatePackage, String expectedBundleFileName,
                                DownloadProgressCallback progressCallback) throws IOException {
        String newUpdateHash = updatePackage.optString(OTAConstants.PACKAGE_HASH_KEY, null);
        if (newUpdateHash == null) {
            // Generate hash from version if not provided
            String versionName = updatePackage.optString(OTAConstants.VERSION_NAME_KEY, "unknown");
            newUpdateHash = String.valueOf(versionName.hashCode());
            OTAUtils.setJSONValueForKey(updatePackage, OTAConstants.PACKAGE_HASH_KEY, newUpdateHash);
        }

        String newUpdateFolderPath = getPackageFolderPath(newUpdateHash);
        String newUpdateMetadataPath = OTAUtils.appendPathComponent(newUpdateFolderPath, OTAConstants.PACKAGE_FILE_NAME);
        
        if (FileUtils.fileAtPathExists(newUpdateFolderPath)) {
            FileUtils.deleteDirectoryAtPath(newUpdateFolderPath);
        }

        String downloadUrlString = updatePackage.optString(OTAConstants.DOWNLOAD_URL_KEY, null);
        if (downloadUrlString == null) {
            throw new OTAInvalidUpdateException("Download URL is missing from update package");
        }

        HttpURLConnection connection = null;
        BufferedInputStream bin = null;
        FileOutputStream fos = null;
        BufferedOutputStream bout = null;
        File downloadFile = null;
        boolean isZip = false;

        try {
            URL downloadUrl = new URL(downloadUrlString);
            connection = (HttpURLConnection) (downloadUrl.openConnection());

            if (android.os.Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP &&
                downloadUrl.toString().startsWith("https")) {
                try {
                    ((HttpsURLConnection)connection).setSSLSocketFactory(new TLSSocketFactory());
                } catch (Exception e) {
                    throw new OTAUnknownException("Error set SSLSocketFactory. ", e);
                }
            }

            connection.setRequestProperty("Accept-Encoding", "identity");
            bin = new BufferedInputStream(connection.getInputStream());

            long totalBytes = connection.getContentLength();
            long receivedBytes = 0;

            File downloadFolder = new File(getOTAPath());
            downloadFolder.mkdirs();
            downloadFile = new File(downloadFolder, OTAConstants.DOWNLOAD_FILE_NAME);
            fos = new FileOutputStream(downloadFile);
            bout = new BufferedOutputStream(fos, OTAConstants.DOWNLOAD_BUFFER_SIZE);
            byte[] data = new byte[OTAConstants.DOWNLOAD_BUFFER_SIZE];
            byte[] header = new byte[4];

            int numBytesRead = 0;
            while ((numBytesRead = bin.read(data, 0, OTAConstants.DOWNLOAD_BUFFER_SIZE)) >= 0) {
                if (receivedBytes < 4) {
                    for (int i = 0; i < numBytesRead; i++) {
                        int headerOffset = (int) (receivedBytes) + i;
                        if (headerOffset >= 4) {
                            break;
                        }
                        header[headerOffset] = data[i];
                    }
                }

                receivedBytes += numBytesRead;
                bout.write(data, 0, numBytesRead);
                if (progressCallback != null) {
                    progressCallback.call(new DownloadProgress(totalBytes, receivedBytes));
                }
            }

            if (totalBytes > 0 && totalBytes != receivedBytes) {
                throw new OTAUnknownException("Received " + receivedBytes + " bytes, expected " + totalBytes);
            }

            isZip = ByteBuffer.wrap(header).getInt() == 0x504b0304;
        } catch (MalformedURLException e) {
            throw new OTAMalformedDataException(downloadUrlString, e);
        } finally {
            try {
                if (bout != null) bout.close();
                if (fos != null) fos.close();
                if (bin != null) bin.close();
                if (connection != null) connection.disconnect();
            } catch (IOException e) {
                throw new OTAUnknownException("Error closing IO resources.", e);
            }
        }

        if (isZip) {
            String unzippedFolderPath = getUnzippedFolderPath();
            FileUtils.unzipFile(downloadFile, unzippedFolderPath);
            FileUtils.deleteFileOrFolderSilently(downloadFile);

            FileUtils.copyDirectoryContents(unzippedFolderPath, newUpdateFolderPath);
            FileUtils.deleteFileAtPathSilently(unzippedFolderPath);

            // Find bundle file in the extracted contents
            String relativeBundlePath = findJSBundleInUpdateContents(newUpdateFolderPath, expectedBundleFileName);

            if (relativeBundlePath == null) {
                throw new OTAInvalidUpdateException("Update is invalid - A JS bundle file named \"" + expectedBundleFileName + "\" could not be found within the downloaded contents.");
            } else {
                OTAUtils.setJSONValueForKey(updatePackage, OTAConstants.RELATIVE_BUNDLE_PATH_KEY, relativeBundlePath);
            }
        } else {
            FileUtils.moveFile(downloadFile, newUpdateFolderPath, expectedBundleFileName);
        }

        OTAUtils.writeJsonToFile(updatePackage, newUpdateMetadataPath);
    }

    private String findJSBundleInUpdateContents(String updateFolderPath, String expectedBundleFileName) {
        File updateFolder = new File(updateFolderPath);
        if (!updateFolder.exists() || !updateFolder.isDirectory()) {
            return null;
        }

        File[] files = updateFolder.listFiles();
        if (files == null) {
            return null;
        }

        // First, check root level
        for (File file : files) {
            if (file.isFile() && file.getName().equals(expectedBundleFileName)) {
                return file.getName();
            }
        }

        // Then check subdirectories recursively
        for (File file : files) {
            if (file.isDirectory()) {
                String found = findJSBundleInUpdateContents(file.getAbsolutePath(), expectedBundleFileName);
                if (found != null) {
                    return file.getName() + "/" + found;
                }
            }
        }

        return null;
    }

    public String getCurrentBundlePath() {
        return getCurrentPackageBundlePath(mBundleFileName);
    }

    public void installPackage(JSONObject updatePackage, boolean removePendingUpdate) {
        String packageHash = updatePackage.optString(OTAConstants.PACKAGE_HASH_KEY, null);
        JSONObject info = getCurrentPackageInfo();

        String currentPackageHash = info.optString(OTAConstants.CURRENT_PACKAGE_KEY, null);
        if (packageHash != null && packageHash.equals(currentPackageHash)) {
            return;
        }

        if (removePendingUpdate) {
            String currentPackageFolderPath = getCurrentPackageFolderPath();
            if (currentPackageFolderPath != null) {
                FileUtils.deleteDirectoryAtPath(currentPackageFolderPath);
            }
        } else {
            String previousPackageHash = getPreviousPackageHash();
            if (previousPackageHash != null && !previousPackageHash.equals(packageHash)) {
                FileUtils.deleteDirectoryAtPath(getPackageFolderPath(previousPackageHash));
            }

            OTAUtils.setJSONValueForKey(info, OTAConstants.PREVIOUS_PACKAGE_KEY, info.optString(OTAConstants.CURRENT_PACKAGE_KEY, null));
        }

        OTAUtils.setJSONValueForKey(info, OTAConstants.CURRENT_PACKAGE_KEY, packageHash);
        updateCurrentPackageInfo(info);
    }

    public void clearUpdates() {
        FileUtils.deleteDirectoryAtPath(getOTAPath());
    }
}

