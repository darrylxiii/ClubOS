# Native App Setup Guide

This guide explains how to build and run The Quantum Club as a native iOS and Android app using Capacitor.

## Prerequisites

### For iOS Development
- macOS (required)
- Xcode 14+ from the Mac App Store
- Xcode Command Line Tools: `xcode-select --install`
- CocoaPods: `sudo gem install cocoapods`
- Apple Developer account (for device testing and App Store)

### For Android Development
- Android Studio (Hedgehog or newer)
- Android SDK (API level 22+)
- Java Development Kit (JDK) 17+

## Initial Setup

### 1. Export to GitHub
1. In Lovable, click "Export to GitHub"
2. Clone the repository to your local machine:
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
   cd YOUR_REPO
   ```

### 2. Install Dependencies
```bash
npm install
```

### 3. Add Native Platforms
```bash
# Add iOS platform
npx cap add ios

# Add Android platform
npx cap add android
```

### 4. Build Web Assets
```bash
npm run build
```

### 5. Sync to Native Projects
```bash
npx cap sync
```

## Running the App

### iOS Simulator/Device
```bash
# Open in Xcode
npx cap open ios

# Or run directly
npx cap run ios
```

In Xcode:
1. Select your target device/simulator
2. Click the Play button or press Cmd+R

### Android Emulator/Device
```bash
# Open in Android Studio
npx cap open android

# Or run directly
npx cap run android
```

In Android Studio:
1. Wait for Gradle sync to complete
2. Select your target device/emulator
3. Click the Run button or press Shift+F10

## Development Workflow

### Hot Reload (Development)
The app is configured to connect to the Lovable sandbox for hot reload:
- URL: `https://ed1ccbea-b8dd-4007-bcc4-b3329d10bf67.lovableproject.com`
- Changes in Lovable will reflect immediately in the native app

### Building for Production
For production builds, update `capacitor.config.ts`:
```typescript
const config: CapacitorConfig = {
  // Remove or comment out the server block for production
  // server: {
  //   url: '...',
  //   cleartext: true,
  // },
};
```

Then rebuild:
```bash
npm run build
npx cap sync
```

## Deep Linking

### iOS Universal Links
The app is configured to handle deep links via Universal Links.
Update `public/.well-known/apple-app-site-association`:
- Replace `TEAMID` with your Apple Developer Team ID

### Android App Links
Update `public/.well-known/assetlinks.json`:
- Replace `SHA256_FINGERPRINT_PLACEHOLDER` with your app's signing certificate fingerprint

Get your fingerprint:
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

## Push Notifications

### iOS Setup
1. In Xcode, enable "Push Notifications" capability
2. Enable "Background Modes" > "Remote notifications"
3. Configure APNs in Apple Developer Portal

### Android Setup
1. Create a Firebase project
2. Add `google-services.json` to `android/app/`
3. FCM is automatically configured

## App Store Submission

### iOS App Store
1. Archive in Xcode: Product > Archive
2. Upload to App Store Connect
3. Submit for review

### Google Play Store
1. Generate signed AAB: Build > Generate Signed Bundle
2. Upload to Google Play Console
3. Submit for review

## Troubleshooting

### iOS Build Errors
```bash
cd ios/App
pod install --repo-update
```

### Android Build Errors
```bash
cd android
./gradlew clean
```

### Sync Issues
```bash
npx cap sync --force
```

## Useful Commands

| Command | Description |
|---------|-------------|
| `npx cap sync` | Sync web assets to native projects |
| `npx cap copy` | Copy web assets only (no plugin updates) |
| `npx cap update` | Update native plugins |
| `npx cap open ios` | Open iOS project in Xcode |
| `npx cap open android` | Open Android project in Android Studio |
| `npx cap run ios` | Build and run on iOS |
| `npx cap run android` | Build and run on Android |
