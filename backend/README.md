# OTA Console Backend API

Node.js/Express backend for managing React Native OTA updates.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your settings
```

3. Run database migrations:
```bash
npm run migrate
```

4. Start server:
```bash
# Development
npm run dev

# Production
npm start
```

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `JWT_EXPIRES_IN` - Token expiration (default: 7d)
- `PORT` - Server port (default: 3001)
- `MAX_FILE_SIZE` - Max APK file size in bytes (default: 200MB)
- `API_KEY_SECRET` - API key for RN app authentication

## API Documentation

### Authentication

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

Returns:
```json
{
  "token": "jwt-token",
  "user": { "id": 1, "email": "user@example.com" }
}
```

### APK Management

#### Upload APK
```http
POST /api/apks/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

apk: <file>
appId: "com.example.myapp"
versionName: "1.0.0"
versionCode: 100
updateType: "major" | "minor"
releaseNotes: "Optional release notes"
```

#### List Versions
```http
GET /api/apks?appId=com.example.myapp
Authorization: Bearer <token>
```

#### Download APK
```http
GET /api/apks/:id/download
```

#### Delete Version
```http
DELETE /api/apks/:id?deleteFiles=true
Authorization: Bearer <token>
```

### Update Checking (Public)

#### Check for Updates
```http
GET /api/updates/check?currentVersion=1.0.0&currentVersionCode=100&appId=com.example.myapp
X-App-Id: com.example.myapp
X-API-Key: <optional-api-key>
```

Returns:
```json
{
  "updateAvailable": true,
  "update": {
    "versionName": "1.0.1",
    "versionCode": 101,
    "updateType": "minor",
    "releaseNotes": "...",
    "downloadUrl": "http://..."
  }
}
```

#### Report Update Status
```http
POST /api/updates/report?deviceId=device123
X-App-Id: com.example.myapp
Content-Type: application/json

{
  "status": "completed" | "failed" | "downloading",
  "fromVersion": "1.0.0",
  "toVersion": "1.0.1",
  "updateType": "minor",
  "errorMessage": null
}
```

## Database Schema

See `database/migrations/001_initial_schema.sql`

## Security

- JWT authentication for console access
- API key authentication for RN apps
- File upload validation
- Rate limiting (recommended for production)

