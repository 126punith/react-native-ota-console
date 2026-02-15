// Firebase Functions v2 Storage trigger - fires when a file is uploaded to Storage
import {onObjectFinalized} from "firebase-functions/v2/storage";
import {defineString} from "firebase-functions/params";
// Admin SDK for accessing Storage and Remote Config
import {getStorage} from "firebase-admin/storage";
import {getRemoteConfig} from "firebase-admin/remote-config";
import {initializeApp} from "firebase-admin/app";
import {logger} from "firebase-functions";
import type {StorageEvent} from "firebase-functions/v2/storage";

// Initialize Firebase Admin (required before using any Admin SDK services)
initializeApp();

// Configurable via Firebase config or environment - e.g. apks/myapp/
const apkPathPrefix = defineString("APK_PATH_PREFIX", {default: "apks/default/"});
const FUNCTION_REGION = process.env.REGION || "us-central1";

/**
 * Cloud Function: onApkUploaded
 *
 * Triggered when any file is uploaded to Firebase Storage.
 * If the file is an APK under the configured APK_PATH_PREFIX, updates Firebase Remote Config with:
 *   - apk_url: public download URL for the APK
 *   - latest_version: version number extracted from filename (e.g. v2.apk -> 2)
 *
 * The mobile app reads these values to show OTA (over-the-air) update prompts.
 *
 * Configuration (set via Firebase config or .env):
 *   APK_PATH_PREFIX - Storage path to watch (default: apks/default/)
 *   REGION - Function region (default: us-central1)
 */
export const onApkUploaded = onObjectFinalized(
  {
    region: FUNCTION_REGION,
  },
  async (event: StorageEvent) => {
    const prefix = apkPathPrefix.value();
    if (!prefix.endsWith("/")) {
      logger.warn("APK_PATH_PREFIX should end with /, normalizing");
    }
    const normalizedPrefix = prefix.endsWith("/") ? prefix : `${prefix}/`;

    // --- Extract event data ---
    const filePath = event.data?.name; // e.g. "apks/myapp/v2.apk"
    const bucket = event.data?.bucket;
    const contentType = event.data?.contentType; // e.g. "application/vnd.android.package-archive"

    logger.info("onApkUploaded triggered", {filePath, bucket, contentType, prefix: normalizedPrefix});

    // --- Validate required fields ---
    if (!filePath || !bucket) {
      logger.warn("Missing file path or bucket in event");
      return;
    }

    // --- Filter: only process files in our APK folder ---
    if (!filePath.startsWith(normalizedPrefix)) {
      logger.info(`Skipping non-APK path: ${filePath} (expected prefix: ${normalizedPrefix})`);
      return;
    }

    // --- Filter: only process APK files (by content type) ---
    // Some uploads may have no contentType; octet-stream is a common fallback
    const isApkByType =
      !contentType ||
      contentType === "application/vnd.android.package-archive" ||
      contentType === "application/octet-stream";
    if (!isApkByType) {
      logger.info(`Skipping non-APK content type: ${contentType}`);
      return;
    }

    try {
      // --- Get Storage reference and file metadata ---
      const storage = getStorage();
      const file = storage.bucket(bucket).file(filePath);
      const [metadata] = await file.getMetadata();

      // Firebase Storage adds a download token for public URLs; use it if present
      const token = (metadata.metadata as Record<string, string> | undefined)
        ?.firebaseStorageDownloadTokens;
      const encodedPath = encodeURIComponent(filePath);

      // --- Build download URL ---
      let downloadUrl: string;
      if (token) {
        // Public URL format: works when file is publicly readable
        downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media&token=${token}`;
      } else {
        // Fallback: generate a signed URL (valid 1 year) if no token
        const [signedUrl] = await file.getSignedUrl({
          action: "read",
          expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
        });
        downloadUrl = signedUrl;
      }

      logger.info("APK upload detected", {filePath, downloadUrl});

      // --- Fetch current Remote Config template ---
      const remoteConfig = getRemoteConfig();
      const template = await remoteConfig.getTemplate();

      if (!template.parameters) {
        template.parameters = {};
      }

      // --- Update apk_url parameter ---
      // The app reads this to download the APK when an update is available
      template.parameters["apk_url"] = {
        defaultValue: {
          value: downloadUrl,
        },
        description: "APK download URL - auto-updated when APK is uploaded to Storage",
      };

      // --- Extract version from filename and update latest_version ---
      // Supports: v2.apk, 2.apk, v1_2_3.apk (uses first number)
      const versionMatch = filePath.match(/v?(\d+)\.apk$/i) ||
        filePath.match(/v?(\d+)_(\d+)_(\d+)\.apk$/i);
      if (versionMatch) {
        const versionNum = versionMatch[1];
        const version = parseInt(versionNum, 10);
        if (!isNaN(version)) {
          template.parameters["latest_version"] = {
            defaultValue: {
              value: String(version),
            },
            valueType: "NUMBER",
            description: "Latest app version - auto-updated from APK filename",
          };
          logger.info("Updated latest_version from filename", {version});
        }
      }

      // --- Publish updated template to Remote Config ---
      const validated = await remoteConfig.validateTemplate(template);
      await remoteConfig.publishTemplate(validated);

      logger.info("Remote Config updated successfully with new apk_url");
    } catch (err) {
      logger.error("Failed to update Remote Config", err);
      throw err;
    }
  }
);
