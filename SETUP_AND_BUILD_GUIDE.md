# 🚀 ASTRA - Complete Setup & Build Guide

## 📋 Table of Contents
1. [Firebase Cloud Messaging Setup](#firebase-setup)
2. [Backend Configuration](#backend-setup)
3. [Frontend Configuration](#frontend-setup)
4. [Running the App](#running)
5. [Building Android APK](#build-apk)
6. [Testing Notifications](#testing)

---

## 🔥 Firebase Cloud Messaging Setup

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add Project"**
3. Enter project name: `ASTRA`
4. Disable Google Analytics (optional)
5. Click **"Create Project"**

### Step 2: Add Android App

1. In Firebase Console, click **⚙️ Settings** > **Project Settings**
2. Click **"Add App"** > **Android**
3. Enter package name: `com.astra` (must match your app)
4. Register app
5. Download `google-services.json`
6. Place it in `/app/frontend/android/app/`

### Step 3: Get Service Account Key (Backend)

1. In Firebase Console, go to **⚙️ Settings** > **Service Accounts**
2. Click **"Generate New Private Key"**
3. Download the JSON file
4. Rename it to `firebase-credentials.json`
5. Place it in `/app/backend/`

### Step 4: Update Firebase SDK

Edit `/app/frontend/android/build.gradle`:

```gradle
buildscript {
    dependencies {
        // Add this line
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
```

Edit `/app/frontend/android/app/build.gradle`:

```gradle
// Add at the bottom of file
apply plugin: 'com.google.gms.google-services'
```

---

## ⚙️ Backend Configuration

### Step 1: Install Dependencies

```bash
cd /app/backend
pip install -r requirements.txt
```

### Step 2: Configure Environment

Edit `/app/backend/.env`:

```env
RAILWAY_BACKEND_URL=https://astra-backend-production-e996.up.railway.app
FIREBASE_CREDENTIALS_PATH=/app/backend/firebase-credentials.json
CORS_ORIGINS=*
```

### Step 3: Start Backend Server

```bash
cd /app/backend
python server.py
```

Or with uvicorn:

```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

Backend will run on: `http://localhost:8001`

**Test it:**
```bash
curl http://localhost:8001/api/health
```

---

## 📱 Frontend Configuration

### Step 1: Install Dependencies

```bash
cd /app/frontend
yarn install
# or
npm install
```

### Step 2: Configure Backend URL

The app uses the Railway backend by default. To use local backend:

Edit `/app/frontend/src/services/notificationService.js`:

```javascript
// Change this line
const API_URL = 'http://YOUR_LOCAL_IP:8001/api';
// e.g., const API_URL = 'http://192.168.1.100:8001/api';
```

**Note:** Use your local IP address (not localhost) for Android device testing.

### Step 3: Update Android Manifest

Edit `/app/frontend/android/app/src/main/AndroidManifest.xml`:

Add before `</application>`:

```xml
<!-- Notification Permissions -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
<uses-permission android:name="android.permission.VIBRATE" />

<!-- Firebase Messaging -->
<service
    android:name="com.google.firebase.messaging.FirebaseMessagingService"
    android:exported="false">
    <intent-filter>
        <action android:name="com.google.firebase.MESSAGING_EVENT" />
    </intent-filter>
</service>
```

---

## 🏃 Running the App

### Option 1: Using React Native CLI (Recommended)

#### Start Metro Bundler:
```bash
cd /app/frontend
yarn start
# or
npx react-native start
```

#### Run on Android Device/Emulator:
```bash
# In a new terminal
cd /app/frontend
yarn android
# or
npx react-native run-android
```

### Option 2: Using Android Studio

1. Open `/app/frontend/android` in Android Studio
2. Let Gradle sync complete
3. Click **Run** (▶️ button)

---

## 📦 Building Android APK

### Method 1: Using React Native CLI (FREE)

#### Step 1: Generate Release Keystore

```bash
cd /app/frontend/android/app

keytool -genkeypair -v -storetype PKCS12 \
  -keystore astra-release-key.keystore \
  -alias astra-key-alias \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

**Remember the password you set!**

#### Step 2: Configure Gradle

Create `/app/frontend/android/gradle.properties`:

```properties
ASTRA_UPLOAD_STORE_FILE=astra-release-key.keystore
ASTRA_UPLOAD_KEY_ALIAS=astra-key-alias
ASTRA_UPLOAD_STORE_PASSWORD=YOUR_KEYSTORE_PASSWORD
ASTRA_UPLOAD_KEY_PASSWORD=YOUR_KEY_PASSWORD
```

#### Step 3: Update `android/app/build.gradle`

Add after `android {`:

```gradle
signingConfigs {
    release {
        if (project.hasProperty('ASTRA_UPLOAD_STORE_FILE')) {
            storeFile file(ASTRA_UPLOAD_STORE_FILE)
            storePassword ASTRA_UPLOAD_STORE_PASSWORD
            keyAlias ASTRA_UPLOAD_KEY_ALIAS
            keyPassword ASTRA_UPLOAD_KEY_PASSWORD
        }
    }
}

buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
}
```

#### Step 4: Build APK

```bash
cd /app/frontend/android
./gradlew assembleRelease
```

**APK Location:**
```
/app/frontend/android/app/build/outputs/apk/release/app-release.apk
```

#### Step 5: Install APK on Device

```bash
adb install app/build/outputs/apk/release/app-release.apk
```

---

### Method 2: Using EAS Build (Expo Application Services)

#### Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

#### Step 2: Login to Expo

```bash
eas login
```

#### Step 3: Configure EAS

```bash
cd /app/frontend
eas build:configure
```

#### Step 4: Build APK

```bash
eas build --platform android --profile preview
```

Build will be available in your Expo account dashboard.

---

## 🧪 Testing Notifications

### Test 1: Check Backend Scheduler

```bash
curl http://localhost:8001/api/notifications/status
```

Expected response:
```json
{
  "firebase_enabled": true,
  "scheduler_running": true,
  "registered_tokens": 1,
  "total_notifications_sent": 0
}
```

### Test 2: Manually Trigger Class Check

```bash
curl -X POST http://localhost:8001/api/notifications/test-scheduler
```

### Test 3: Send Test Notification

```bash
curl -X POST http://localhost:8001/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "YOUR_USER_ID",
    "title": "Test Notification",
    "body": "Testing ASTRA notifications!",
    "data": {"type": "test"}
  }'
```

### Test 4: Check Notification History

```bash
curl http://localhost:8001/api/notifications/history/YOUR_USER_ID
```

---

## 🔧 Troubleshooting

### Issue: Notifications not receiving

**Solution 1:** Check Firebase setup
```bash
# Verify google-services.json exists
ls /app/frontend/android/app/google-services.json
```

**Solution 2:** Check FCM token registration
- Open app
- Check logs: `adb logcat | grep FCM`
- Look for: "✅ Token registered with backend"

**Solution 3:** Verify backend scheduler
```bash
# Check backend logs
tail -f /var/log/astra-backend.log
```

### Issue: APK build fails

**Solution 1:** Clean Gradle cache
```bash
cd /app/frontend/android
./gradlew clean
./gradlew assembleRelease
```

**Solution 2:** Check JDK version
```bash
java -version
# Should be JDK 11 or 17
```

### Issue: App crashes on startup

**Solution:** Check logs
```bash
adb logcat *:E | grep ASTRA
```

---

## 📊 Scheduler Configuration

The class detection scheduler runs **every 2 minutes** by default.

To change the interval, edit `/app/backend/server.py`:

```python
scheduler.add_job(
    check_upcoming_classes,
    trigger=IntervalTrigger(minutes=5),  # Change to 5 minutes
    id='class_detector',
    ...
)
```

**Notification Timing:**
- **Reminder:** 10-15 minutes before class
- **Start:** 0-5 minutes after class starts

**Duplicate Prevention:** 1-hour cooldown per notification

---

## 🎯 Next Steps

1. ✅ Set up Firebase project
2. ✅ Configure backend with Firebase credentials
3. ✅ Install frontend dependencies
4. ✅ Update AndroidManifest.xml
5. ✅ Run app and test notifications
6. ✅ Build release APK
7. ✅ Distribute to users

---

## 📝 Important Notes

- **Firebase Free Tier:** Unlimited notifications (no cost)
- **APK Size:** ~50-80 MB (includes all libraries)
- **Minimum Android Version:** API 21 (Android 5.0)
- **Permissions Required:** Notifications, Internet, Vibrate

---

## 🆘 Support

If you encounter issues:

1. Check Firebase Console > Cloud Messaging
2. Verify backend logs
3. Check Android logcat
4. Ensure google-services.json is in correct location
5. Verify Firebase credentials JSON in backend

---

**Build Date:** $(date)
**Version:** 3.2.3
**Author:** ASTRA Development Team

