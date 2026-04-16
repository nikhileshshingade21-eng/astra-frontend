# 🚀 ASTRA React Native - Build & Deploy Guide

Complete guide for building your ASTRA app APK.

---

## 📋 Prerequisites

1. **Firebase Project Setup** (15 minutes)
2. **EAS CLI** (for building)
3. **Expo Account** (free)

---

## 🔥 STEP 1: Firebase Setup

### 1.1 Create Firebase Project

1. Go to https://console.firebase.google.com/
2. Click **"Add Project"**
3. Name: `ASTRA`
4. Disable Google Analytics (optional)
5. Click **"Create Project"**

### 1.2 Add Android App

1. In Firebase Console, click **⚙️ Settings** > **Project Settings**
2. Under "Your apps", click **Android icon**
3. **Package name:** `com.nikhil.astra` (already configured in your app.json)
4. **App nickname:** ASTRA
5. Click **"Register app"**

### 1.3 Download google-services.json

1. Download `google-services.json`
2. Place it in: `/app/android/app/google-services.json`

**Note:** You may need to generate the android folder first (see next steps).

### 1.4 Enable Cloud Messaging

1. In Firebase Console, go to **Build** > **Cloud Messaging**
2. Click **"Get Started"**
3. Enable Cloud Messaging API

### 1.5 Get Service Account Key (for Backend)

1. Go to **⚙️ Settings** > **Service Accounts**
2. Click **"Generate New Private Key"**
3. Download the JSON file
4. Upload to your Railway backend as `firebase-credentials.json`

---

## 📱 STEP 2: Generate Android Native Code

Your app uses React Native 0.76.9. Generate the android folder:

```bash
cd /app

# Generate Android native code
npx react-native init AstraTemp --version 0.76.9

# Copy android folder
cp -r AstraTemp/android ./

# Clean up
rm -rf AstraTemp

# Verify
ls -la android/
```

---

## 🔧 STEP 3: Configure Android Project

### 3.1 Update `android/build.gradle`

Add Firebase plugin:

```gradle
buildscript {
    ext {
        buildToolsVersion = "34.0.0"
        minSdkVersion = 21
        compileSdkVersion = 34
        targetSdkVersion = 34
    }
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath("com.android.tools.build:gradle")
        classpath("com.facebook.react:react-native-gradle-plugin")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin")
        // Add this line:
        classpath("com.google.gms:google-services:4.4.0")
    }
}
```

### 3.2 Update `android/app/build.gradle`

Add at the top:
```gradle
apply plugin: "com.android.application"
apply plugin: "org.jetbrains.kotlin.android"
apply plugin: "com.facebook.react"

// Add at the very bottom:
apply plugin: 'com.google.gms.google-services'
```

Update package name:
```gradle
android {
    namespace "com.nikhil.astra"
    compileSdk rootProject.ext.compileSdkVersion

    defaultConfig {
        applicationId "com.nikhil.astra"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1
        versionName "3.2.3"
        multiDexEnabled true
    }
}
```

### 3.3 Update `android/app/src/main/AndroidManifest.xml`

Add permissions:
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.USE_BIOMETRIC" />
    
    <application
        android:name=".MainApplication"
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher"
        android:allowBackup="false"
        android:theme="@style/AppTheme">
        
        <!-- Your main activity -->
        <activity
            android:name=".MainActivity"
            android:label="@string/app_name"
            android:configChanges="keyboard|keyboardHidden|orientation|screenLayout|screenSize"
            android:windowSoftInputMode="adjustResize"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
        
        <!-- Firebase Messaging Service -->
        <service
            android:name="com.google.firebase.messaging.FirebaseMessagingService"
            android:exported="false">
            <intent-filter>
                <action android:name="com.google.firebase.MESSAGING_EVENT" />
            </intent-filter>
        </service>
        
        <!-- Notification Metadata -->
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_icon"
            android:resource="@mipmap/ic_launcher" />
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_channel_id"
            android:value="astra-class-reminders" />
    </application>
</manifest>
```

### 3.4 Place google-services.json

```bash
cp google-services.json /app/android/app/
```

---

## 🏗️ STEP 4: Build APK

### Method 1: Using React Native CLI (Free, Local)

#### Generate Keystore (First Time Only)

```bash
cd /app/android/app

keytool -genkeypair -v -storetype PKCS12 \
  -keystore astra-release-key.keystore \
  -alias astra-key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

**Remember your password!**

#### Configure Signing

Create `/app/android/gradle.properties`:

```properties
ASTRA_UPLOAD_STORE_FILE=astra-release-key.keystore
ASTRA_UPLOAD_KEY_ALIAS=astra-key
ASTRA_UPLOAD_STORE_PASSWORD=YOUR_PASSWORD
ASTRA_UPLOAD_KEY_PASSWORD=YOUR_PASSWORD
```

#### Update build.gradle for Signing

In `/app/android/app/build.gradle`:

```gradle
android {
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
        }
    }
}
```

#### Build APK

```bash
cd /app/android
./gradlew clean
./gradlew assembleRelease
```

**APK Location:**
```
/app/android/app/build/outputs/apk/release/app-release.apk
```

#### Install on Device

```bash
adb install app/build/outputs/apk/release/app-release.apk
```

---

### Method 2: Using EAS Build (Recommended, Cloud-based)

#### Install EAS CLI

```bash
npm install -g eas-cli
```

#### Login to Expo

```bash
eas login
```

#### Configure EAS

Your `eas.json` already exists. Update it if needed:

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

#### Build APK

```bash
cd /app
eas build --platform android --profile preview
```

This will:
1. Upload your code to Expo servers
2. Build in the cloud
3. Provide download link when done

#### Download APK

Check your Expo dashboard or use the link provided in terminal.

---

## 🧪 STEP 5: Testing

### Test on Emulator

```bash
cd /app
yarn android
```

### Test Notifications

1. Open app and log in
2. Grant notification permissions
3. Check logs for FCM token:
   ```
   adb logcat | grep FCM
   ```
4. Backend will automatically detect classes and send notifications

---

## 📤 STEP 6: Distribution

### Option A: Direct APK

Share the APK file:
```
/app/android/app/build/outputs/apk/release/app-release.apk
```

### Option B: Firebase App Distribution

1. Go to Firebase Console > **App Distribution**
2. Upload APK
3. Invite testers
4. They'll get download link

### Option C: Google Play Store

1. Build app bundle:
   ```bash
   eas build --platform android --profile production
   ```
2. Upload to Google Play Console
3. Go through review process

---

## 🔍 Troubleshooting

### Issue: Build fails with Firebase error

**Solution:** Verify google-services.json is in correct location:
```bash
ls /app/android/app/google-services.json
```

### Issue: Notifications not working

**Solution:** Check FCM token registration:
```javascript
// In App.js, check logs
console.log('FCM Token:', await messaging().getToken());
```

### Issue: APK size too large

**Solution:** Enable ProGuard in build.gradle:
```gradle
buildTypes {
    release {
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

---

## ✅ Checklist

- [ ] Firebase project created
- [ ] Android app added to Firebase
- [ ] google-services.json downloaded and placed
- [ ] Service account key for backend obtained
- [ ] Android native code generated
- [ ] build.gradle files updated
- [ ] AndroidManifest.xml updated
- [ ] Keystore generated (for local build)
- [ ] APK built successfully
- [ ] APK installed and tested
- [ ] Notifications working
- [ ] Backend scheduler running

---

## 🎯 Quick Commands

```bash
# Clean and rebuild
cd /app/android && ./gradlew clean && ./gradlew assembleRelease

# Install APK
adb install app/build/outputs/apk/release/app-release.apk

# Check logs
adb logcat | grep ASTRA

# EAS Build
eas build --platform android --profile preview
```

---

**Build Date:** $(date)  
**App Version:** 3.2.3  
**Package:** com.nikhil.astra

