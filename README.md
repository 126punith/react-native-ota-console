# React Native OTA Update Console

A complete Over-The-Air (OTA) update management system for React Native Android apps. This solution allows you to upload, manage, and distribute APK updates and JavaScript bundles directly to your apps, bypassing Google Play Console restrictions. OTA updates are controlled via **Firebase** (Storage, Cloud Functions, Remote Config) for seamless distribution.

## Demo Video

Watch the system in action: [YouTube Demo](https://www.youtube.com/watch?v=l2u8tQ5OeyY)

See how a React Native app automatically detects, downloads, and installs new APK versions with real-time server logs and web console management.

## Features

- **APK Management**: Upload and manage multiple versions of your React Native Android apps
- **Major Updates**: Full APK updates that require installation
- **Minor Updates**: JavaScript bundle updates for code changes
- **WiFi Force Updates**: Automatically force updates when WiFi is available
- **Version Control**: Track and manage app versions with release notes
- **Web Console**: Beautiful web interface for managing uploads and versions
- **React Native SDK**: Easy-to-integrate SDK for your React Native apps
- **Firebase Backend**: Optional Firebase integration (Storage + Cloud Functions + Remote Config) for OTA control

## Project Structure

```
console_project/
├── backend/              # Node.js/Express API server
├── frontend/             # React web console
├── react-native-ota-sdk/ # React Native SDK ([npm](https://www.npmjs.com/package/react-native-ota-sdk) | [README](react-native-ota-sdk/README.md))
└── database/             # Database migrations
```

## Quick Start

### Prerequisites

- Node.js 16+ and npm
- PostgreSQL 12+
- React Native development environment (for SDK integration)

### 1. Database Setup

```bash
# Create PostgreSQL database
createdb ota_console

# Run migrations
cd database
node migrate.js
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your database credentials
# DATABASE_URL=postgresql://user:password@localhost:5432/ota_console
# JWT_SECRET=your-secret-key

# Start server
npm run dev
```

The backend will run on `http://localhost:3001`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will run on `http://localhost:3000`

### 4. Using the SDK in Your React Native App

The SDK is published on npm: **[react-native-ota-sdk](https://www.npmjs.com/package/react-native-ota-sdk)**

```bash
npm install react-native-ota-sdk
```

See [React Native SDK README](react-native-ota-sdk/README.md) for detailed integration instructions.

## Usage

### Web Console

1. Register/Login at `http://localhost:3000`
2. Upload APK files with version information
3. Manage versions and view update statistics
4. Download APKs for distribution

### SDK Integration

The SDK (`react-native-ota-sdk`) supports both custom API and Firebase backends. Install from [npm](https://www.npmjs.com/package/react-native-ota-sdk).

```javascript
import { OTAUpdater } from 'react-native-ota-sdk';

const updater = new OTAUpdater({
  apiUrl: 'http://your-server.com/api',
  appId: 'com.example.myapp',
  apiKey: 'your-api-key',
  forceUpdateOnWifi: true,
  autoDownloadOnWifi: true,
  onUpdateAvailable: (update) => {
    console.log('Update available:', update);
  }
});

// Start checking for updates
updater.start();
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### APK Management (Protected)
- `POST /api/apks/upload` - Upload new APK version
- `GET /api/apks` - List all versions
- `GET /api/apks/:id` - Get version details
- `GET /api/apks/:id/download` - Download APK file
- `DELETE /api/apks/:id` - Delete version

### Update Checking (Public)
- `GET /api/updates/check` - Check for available updates
- `POST /api/updates/report` - Report update status

## Security Considerations

- Use HTTPS in production
- Change default JWT_SECRET and API_KEY_SECRET
- Implement rate limiting for production
- Validate APK signatures before installation
- Use API keys for app authentication

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

