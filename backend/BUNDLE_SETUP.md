# Bundle Upload and Download Setup

This guide explains how to configure and use the bundle upload/download functionality for OTA updates.

## Overview

The backend now supports:
- **APK Upload**: Full app updates (major updates)
- **Bundle Upload**: JavaScript bundle updates (minor updates)
- **Bundle Download**: Serve bundles to native OTA module

## API Endpoints

### Upload Bundle

**POST** `/api/bundles/upload`

Upload a JavaScript bundle for an existing version.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body (form-data):**
- `bundle` (file): The bundle file (.bundle, .js, or .zip)
- `versionId` (integer): ID of the version to attach bundle to

**Example:**
```bash
curl -X POST http://localhost:3001/api/bundles/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "bundle=@index.android.bundle" \
  -F "versionId=1"
```

**Response:**
```json
{
  "message": "Bundle uploaded successfully",
  "bundlePath": "/path/to/bundle",
  "version": {
    "id": 1,
    "versionName": "1.0.1",
    "versionCode": 2
  }
}
```

### Download Bundle

**GET** `/api/bundles/:versionId/download`

Download a bundle file for a specific version.

**Example:**
```bash
curl http://localhost:3001/api/bundles/1/download \
  -o bundle.bundle
```

**Response:**
- Returns the bundle file with appropriate headers
- Content-Type: `application/javascript` for .bundle/.js files
- Content-Type: `application/zip` for .zip files

### Update Check (Updated)

**GET** `/api/updates/check`

Now includes `bundleUrl` in the response for minor updates.

**Response:**
```json
{
  "updateAvailable": true,
  "update": {
    "versionName": "1.0.1",
    "versionCode": 2,
    "updateType": "minor",
    "releaseNotes": "Bug fixes",
    "downloadUrl": "http://localhost:3001/api/apks/1/download",
    "bundleUrl": "http://localhost:3001/api/bundles/1/download",
    "apkSize": 52428800,
    "bundleSize": 1048576
  }
}
```

## Workflow

### 1. Upload APK (Major Update)

```bash
# Upload APK first
curl -X POST http://localhost:3001/api/apks/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "apk=@app.apk" \
  -F "appId=com.example.app" \
  -F "versionName=1.0.0" \
  -F "versionCode=1" \
  -F "updateType=major" \
  -F "releaseNotes=Initial release"
```

### 2. Upload Bundle (Minor Update)

```bash
# Build your bundle
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output index.android.bundle

# Upload bundle for existing version
curl -X POST http://localhost:3001/api/bundles/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "bundle=@index.android.bundle" \
  -F "versionId=1"
```

### 3. Create New Version with Bundle (Minor Update)

```bash
# Create version record (without APK)
# Note: You may need to modify the APK upload endpoint to allow version creation without APK
# Or create version via database directly, then upload bundle

# Upload bundle
curl -X POST http://localhost:3001/api/bundles/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "bundle=@index.android.bundle" \
  -F "versionId=2"
```

## Frontend Integration

The frontend can be updated to support bundle uploads:

```javascript
// Upload bundle for a version
const uploadBundle = async (versionId, bundleFile) => {
  const formData = new FormData();
  formData.append('bundle', bundleFile);
  formData.append('versionId', versionId);

  const response = await fetch('/api/bundles/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  return response.json();
};
```

## Native Module Usage

The native module will automatically use `bundleUrl` when available:

```javascript
const result = await versionChecker.checkForUpdates(currentVersion);

if (result.updateAvailable && result.update.updateType === 'minor') {
  // Native module will use bundleUrl automatically
  if (result.update.bundleUrl) {
    await bundleUpdater.downloadBundle(result.update.bundleUrl, result.update.versionName);
    await bundleUpdater.applyUpdate(bundlePath);
  }
}
```

## File Size Limits

- **Default bundle size limit**: 50MB
- **Configurable via**: `MAX_BUNDLE_SIZE` environment variable (in bytes)

Example:
```bash
MAX_BUNDLE_SIZE=104857600  # 100MB
```

## Supported File Types

- `.bundle` - React Native bundle file
- `.js` - JavaScript file
- `.zip` - Zipped bundle (will be extracted by native module)

## Testing

### Test Bundle Upload

```bash
# Create a test bundle
echo "console.log('Test bundle');" > test.bundle

# Upload it
curl -X POST http://localhost:3001/api/bundles/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "bundle=@test.bundle" \
  -F "versionId=1"
```

### Test Bundle Download

```bash
# Download bundle
curl http://localhost:3001/api/bundles/1/download \
  -o downloaded.bundle

# Verify
cat downloaded.bundle
```

### Test Update Check

```bash
curl "http://localhost:3001/api/updates/check?currentVersion=1.0.0&currentVersionCode=1" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "X-App-Id: com.example.app"
```

## Troubleshooting

### Bundle Not Found

- Verify version exists: `GET /api/apks/:id`
- Check bundle_path is set in database
- Verify file exists on server filesystem

### Upload Fails

- Check file size (must be < MAX_BUNDLE_SIZE)
- Verify file type (.bundle, .js, or .zip)
- Check authentication token is valid
- Verify versionId exists

### Download Fails

- Check bundle_path in database
- Verify file exists on server
- Check file permissions
- Verify version is active (is_active = true)

## Environment Variables

Add to `.env`:

```env
# Bundle upload size limit (in bytes)
MAX_BUNDLE_SIZE=52428800  # 50MB

# APK upload size limit (in bytes)
MAX_FILE_SIZE=209715200   # 200MB
```


