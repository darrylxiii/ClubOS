# App Signing & Submission Guide

This guide covers the complete process for signing and submitting The Quantum Club app to the Apple App Store and Google Play Store.

## Table of Contents
1. [iOS App Signing](#ios-app-signing)
2. [Android App Signing](#android-app-signing)
3. [CI/CD Secrets Setup](#cicd-secrets-setup)
4. [App Store Submission](#app-store-submission)
5. [Play Store Submission](#play-store-submission)

---

## iOS App Signing

### Prerequisites
- Apple Developer Account ($99/year)
- Xcode installed on macOS
- Fastlane (optional but recommended)

### Step 1: Create App ID

1. Go to [Apple Developer Portal](https://developer.apple.com)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Click **Identifiers** → **+**
4. Select **App IDs** → **App**
5. Enter:
   - Description: `The Quantum Club`
   - Bundle ID: `app.lovable.ed1ccbeab8dd4007bcc4b3329d10bf67`
6. Enable capabilities:
   - Push Notifications
   - Associated Domains
   - Sign in with Apple

### Step 2: Create Distribution Certificate

```bash
# Using Fastlane (recommended)
fastlane match appstore

# Or manually:
# 1. Open Keychain Access
# 2. Keychain Access → Certificate Assistant → Request a Certificate from CA
# 3. Save the .certSigningRequest file
# 4. Upload to Apple Developer Portal → Certificates → +
# 5. Select "Apple Distribution"
# 6. Upload CSR and download certificate
# 7. Double-click to install in Keychain
```

### Step 3: Create Provisioning Profile

1. Go to **Profiles** → **+**
2. Select **App Store** (for distribution)
3. Select your App ID
4. Select your Distribution Certificate
5. Name it: `The Quantum Club Distribution`
6. Download and double-click to install

### Step 4: Configure Xcode Project

```bash
# Open iOS project
npx cap open ios
```

In Xcode:
1. Select the **App** target
2. Go to **Signing & Capabilities**
3. Uncheck "Automatically manage signing"
4. Select your Team
5. Select your Provisioning Profile
6. Ensure Bundle ID matches

### Step 5: Export Certificate for CI/CD

```bash
# Export .p12 certificate from Keychain
# 1. Open Keychain Access
# 2. Find your "Apple Distribution" certificate
# 3. Right-click → Export
# 4. Save as .p12 with a strong password

# Convert to base64 for GitHub Secrets
base64 -i certificate.p12 | pbcopy
```

---

## Android App Signing

### Prerequisites
- Google Play Developer Account ($25 one-time)
- Java Development Kit (JDK) 17+
- Android Studio

### Step 1: Generate Signing Keystore

```bash
# Generate new keystore
keytool -genkeypair \
  -v \
  -storetype PKCS12 \
  -keystore thequantumclub.keystore \
  -alias thequantumclub \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# Answer the prompts:
# - Keystore password: [SECURE_PASSWORD]
# - Key password: [SECURE_PASSWORD] (or same as keystore)
# - First and last name: The Quantum Club
# - Organizational unit: Engineering
# - Organization: The Quantum Club
# - City: Amsterdam
# - State: North Holland
# - Country: NL
```

### Step 2: Configure Gradle for Signing

Create/update `android/app/build.gradle`:

```groovy
android {
    // ... existing config ...

    signingConfigs {
        release {
            if (System.getenv("ANDROID_KEYSTORE_PASSWORD")) {
                storeFile file("release.keystore")
                storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
                keyAlias System.getenv("ANDROID_KEY_ALIAS")
                keyPassword System.getenv("ANDROID_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Step 3: Create Google Play Service Account

1. Go to [Google Play Console](https://play.google.com/console)
2. Navigate to **Setup** → **API access**
3. Click **Create new service account**
4. Follow the link to Google Cloud Console
5. Create service account with name: `play-store-deploy`
6. Grant role: **Service Account User**
7. Create JSON key and download
8. Back in Play Console, grant access to the service account

### Step 4: Export Keystore for CI/CD

```bash
# Convert keystore to base64
base64 -i thequantumclub.keystore | pbcopy
# Paste into GitHub Secret: ANDROID_KEYSTORE
```

---

## CI/CD Secrets Setup

### GitHub Repository Secrets

Go to **Settings** → **Secrets and variables** → **Actions** and add:

#### iOS Secrets
| Secret Name | Description |
|-------------|-------------|
| `IOS_DISTRIBUTION_CERT_P12` | Base64-encoded .p12 certificate |
| `IOS_DISTRIBUTION_CERT_PASSWORD` | Password for .p12 file |
| `IOS_PROVISIONING_PROFILE` | Base64-encoded .mobileprovision |
| `IOS_PROVISIONING_PROFILE_NAME` | Name of provisioning profile |
| `APP_STORE_CONNECT_ISSUER_ID` | App Store Connect API issuer ID |
| `APP_STORE_CONNECT_KEY_ID` | App Store Connect API key ID |
| `APP_STORE_CONNECT_PRIVATE_KEY` | App Store Connect API private key (.p8) |

#### Android Secrets
| Secret Name | Description |
|-------------|-------------|
| `ANDROID_KEYSTORE` | Base64-encoded keystore file |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | Key alias (e.g., `thequantumclub`) |
| `ANDROID_KEY_PASSWORD` | Key password |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | Service account JSON content |

#### Optional
| Secret Name | Description |
|-------------|-------------|
| `SLACK_WEBHOOK_URL` | Slack webhook for notifications |

---

## App Store Submission

### Pre-Submission Checklist

- [ ] App builds successfully on release configuration
- [ ] All required screenshots uploaded (see SCREENSHOT_SPECS.md)
- [ ] App description and metadata complete
- [ ] Privacy policy URL accessible
- [ ] Support URL accessible
- [ ] App icon (1024x1024) uploaded
- [ ] All required device sizes have screenshots
- [ ] Age rating questionnaire completed
- [ ] Export compliance answered
- [ ] Content rights confirmed

### Submission Steps

1. **Archive the app in Xcode**
   ```bash
   npx cap open ios
   # Product → Archive
   ```

2. **Validate the archive**
   - Click "Validate App" in Organizer
   - Fix any issues

3. **Upload to App Store Connect**
   - Click "Distribute App"
   - Select "App Store Connect"
   - Upload

4. **Complete App Store Connect listing**
   - Go to [App Store Connect](https://appstoreconnect.apple.com)
   - Add the new build to the submission
   - Fill in "What's New"
   - Submit for Review

### Review Guidelines Considerations

- Ensure app functions without crashing
- All placeholder content removed
- Login works correctly
- In-app purchases (if any) are testable
- Privacy labels accurately describe data collection

---

## Play Store Submission

### Pre-Submission Checklist

- [ ] App builds as signed AAB
- [ ] Feature graphic (1024x500) created
- [ ] Screenshots for all required sizes
- [ ] App description in all target languages
- [ ] Privacy policy URL
- [ ] Data safety section completed
- [ ] Content rating questionnaire completed
- [ ] Target audience and content settings

### Submission Steps

1. **Build the release AAB**
   ```bash
   cd android
   ./gradlew bundleRelease
   ```

2. **Upload to Play Console**
   - Go to [Google Play Console](https://play.google.com/console)
   - Navigate to your app → **Release** → **Production**
   - Click "Create new release"
   - Upload the AAB file

3. **Complete store listing**
   - Fill in all required metadata
   - Upload graphics and screenshots
   - Complete Data safety form

4. **Submit for review**
   - Review the pre-launch report
   - Address any issues
   - Submit for review

### Play Store Policies

- Ensure compliance with [Developer Program Policies](https://play.google.com/about/developer-content-policy/)
- Data safety form must be accurate
- Declare all permissions usage
- Follow Families policy if targeting children

---

## Troubleshooting

### iOS Common Issues

**Code Signing Error**
```bash
# Reset code signing
cd ios/App
rm -rf ~/Library/MobileDevice/Provisioning\ Profiles/*
fastlane match appstore --force
```

**Archive Failed**
- Ensure correct provisioning profile selected
- Check bundle ID matches
- Verify certificate is valid

### Android Common Issues

**Signing Failed**
```bash
# Verify keystore
keytool -list -v -keystore thequantumclub.keystore
```

**AAB Upload Rejected**
- Check version code is higher than previous
- Ensure correct signing key
- Verify target SDK meets minimum requirements

---

## Maintenance

### Certificate Renewal

**iOS certificates expire after 1 year**
- Set calendar reminder 30 days before expiration
- Generate new certificate and update profiles
- Update CI/CD secrets

**Android keystore**
- Keep keystore file secure (cannot be regenerated)
- Store backup in secure location
- Update if compromised

### Version Management

```bash
# Increment iOS version
cd ios/App
agvtool new-marketing-version 1.1.0
agvtool next-version -all

# Increment Android version
# Update versionCode and versionName in android/app/build.gradle
```

---

## Support

For issues with app signing or submission:
- Apple: [Developer Support](https://developer.apple.com/support/)
- Google: [Play Console Help](https://support.google.com/googleplay/android-developer/)
- Fastlane: [Documentation](https://docs.fastlane.tools)
