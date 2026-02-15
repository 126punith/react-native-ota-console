# Firebase Cloud Functions for OTA Updates

When an APK is uploaded to Firebase Storage, this Cloud Function automatically updates Firebase Remote Config with the download URL and version. Your React Native app reads these values to show OTA update prompts.

## Prerequisites

- **Firebase Blaze (pay-as-you-go) plan** – required for Cloud Functions
- Firebase project with Storage and Remote Config enabled
- Node.js 18+

## Architecture

1. **Upload APK** → Firebase Storage (e.g. `apks/myapp/v2.apk`)
2. **Cloud Function** (`onApkUploaded`) triggers on upload
3. **Function** updates Remote Config with `apk_url` and `latest_version`
4. **App** fetches Remote Config and downloads from `apk_url` when update is needed

## Setup

### 1. Configure your app's firebase.json

In your React Native app root, create or update `firebase.json`:

```json
{
  "functions": {
    "source": "node_modules/react-native-ota-sdk/functions"
  }
}
```

### 2. Install dependencies

```bash
cd node_modules/react-native-ota-sdk/functions
npm install
```

### 3. Configure the function

Copy `.env.example` to `.env` and set your values:

```bash
cp .env.example .env
```

| Variable | Purpose | Example |
|----------|---------|---------|
| `APK_PATH_PREFIX` | Storage path to watch | `apks/myapp/` |
| `REGION` | Function region | `us-central1` |

Or set via Firebase config when deploying:

```bash
firebase functions:config:set ota.apk_path_prefix="apks/myapp/"
```

For `defineString` params, use Firebase's built-in secret/param system or set environment variables in your deployment.

### 4. Create Remote Config parameters

In [Firebase Console](https://console.firebase.google.com) → Remote Config, ensure these parameters exist:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `min_version` | Number | `1` | Users below this MUST update (blocked) |
| `latest_version` | Number | `1` | Current version (optional update) |
| `apk_url` | String | (empty) | Auto-updated by Cloud Function |
| `update_message` | String | Message | Shown in update UI |

The function updates `apk_url` and `latest_version` automatically. Create `min_version` and `update_message` manually if needed.

## Deploy

From your app root (where `firebase.json` lives):

```bash
firebase deploy --only functions
```

Or from the functions directory:

```bash
cd node_modules/react-native-ota-sdk/functions
npm run deploy
```

(Requires `firebase.json` in a parent directory with the correct project.)

## IAM Permissions

The default compute service account needs:

- **Firebase Remote Config Admin** – to update Remote Config
- **Service Usage Consumer** – required by Remote Config API
- **Storage Object Viewer** – to read file metadata

Add these in [Google Cloud IAM](https://console.cloud.google.com/iam-admin/iam) for your project.

## Version from filename

Upload APKs with version in the filename:

- `v2.apk` or `2.apk` → sets `latest_version = 2`
- `v1_2_3.apk` → sets `latest_version = 1`

## App integration

Use `@react-native-firebase/remote-config` in your app. The function expects your app to read:

- `min_version` – force update if `versionCode < min_version`
- `latest_version` – optional update if `versionCode < latest_version`
- `apk_url` – download URL for the APK
- `update_message` – message shown to users

See the main [react-native-ota-sdk README](../README.md) for app-side integration.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Permission denied" when updating Remote Config | Add **Firebase Remote Config Admin** and **Service Usage Consumer** to the compute service account |
| `apk_url` not updating | Check Functions logs; ensure file is under `APK_PATH_PREFIX` |
| Function not triggering | Ensure upload path matches `APK_PATH_PREFIX`; check Storage bucket is the default |
| 0 logs after upload | Grant **Storage Object Viewer** to the Eventarc service account |
