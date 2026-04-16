# 🚨 CRITICAL: Android Native Setup Required

## ⚠️ Issue: Missing Android Native Code

Your React Native app is missing the native Android folder structure. This is required for:
- Firebase Cloud Messaging
- Push Notifications
- APK Building

---

## ✅ Solution: Initialize Android Project

### Option 1: Using React Native CLI (Recommended)

```bash
cd /app/frontend

# Initialize React Native with template
npx react-native init AstraTemp --version 0.76.9

# Copy android folder to your project
cp -r AstraTemp/android ./
rm -rf AstraTemp

# Install dependencies
yarn install

# Link native modules
cd android
./gradlew clean
cd ..
```

### Option 2: Using Expo Prebuild (If using Expo)

```bash
cd /app/frontend

# Add expo if not present
yarn add expo

# Prebuild to generate native folders
npx expo prebuild --platform android

# This will create:
# - android/ folder
# - ios/ folder (optional)
```

---

## 📝 After Android Folder is Created

### 1. Add Firebase Configuration

Place `google-services.json` in:
```
/app/frontend/android/app/google-services.json
```

### 2. Update `android/build.gradle`

```gradle
buildscript {
    ext {
        buildToolsVersion = "34.0.0"
        minSdkVersion = 21
        compileSdkVersion = 34
        targetSdkVersion = 34
        ndkVersion = "26.1.10909125"
        kotlinVersion = "1.9.22"
    }
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath("com.android.tools.build:gradle:8.1.1")
        classpath("com.facebook.react:react-native-gradle-plugin")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin")
        // Add Firebase
        classpath("com.google.gms:google-services:4.4.0")
    }
}
```

### 3. Update `android/app/build.gradle`

Add at the top:
```gradle
apply plugin: "com.android.application"
apply plugin: "org.jetbrains.kotlin.android"
apply plugin: "com.facebook.react"

// Add at the bottom
apply plugin: 'com.google.gms.google-services'
```

### 4. Update `android/app/src/main/AndroidManifest.xml`

Add permissions and Firebase service:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    
    <application
        android:name=".MainApplication"
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher"
        android:allowBackup="false"
        android:theme="@style/AppTheme">
        
        <!-- Main Activity -->
        <activity
            android:name=".MainActivity"
            android:label="@string/app_name"
            android:configChanges="keyboard|keyboardHidden|orientation|screenLayout|screenSize|smallestScreenSize|uiMode"
            android:launchMode="singleTask"
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
            android:name="com.google.firebase.messaging.default_notification_color"
            android:resource="@color/primary" />
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_channel_id"
            android:value="astra-class-reminders" />
            
    </application>
</manifest>
```

### 5. Update Package Name

In `android/app/build.gradle`:

```gradle
android {
    namespace "com.astra"
    compileSdk rootProject.ext.compileSdkVersion
    
    defaultConfig {
        applicationId "com.astra"  // Your app package name
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1
        versionName "3.2.3"
        multiDexEnabled true
    }
}
```

---

## 🔧 Quick Setup Script

Save this as `setup-android.sh`:

```bash
#!/bin/bash

echo "🚀 Setting up Android for ASTRA..."

cd /app/frontend

# Check if android exists
if [ -d "android" ]; then
    echo "✅ Android folder already exists"
else
    echo "📦 Creating Android project..."
    
    # Option 1: Using template
    npx react-native init AstraTemp --version 0.76.9
    cp -r AstraTemp/android ./
    rm -rf AstraTemp
    
    echo "✅ Android folder created"
fi

# Install dependencies
echo "📥 Installing dependencies..."
yarn install

# Link native modules
echo "🔗 Linking native modules..."
cd android
./gradlew clean
cd ..

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Add google-services.json to android/app/"
echo "2. Update AndroidManifest.xml (see guide above)"
echo "3. Run: yarn android"
```

Make it executable:
```bash
chmod +x setup-android.sh
./setup-android.sh
```

---

## 🎯 After Setup

Test the build:

```bash
cd /app/frontend

# Start Metro
yarn start

# In another terminal, run Android
yarn android
```

---

## 📚 Additional Resources

- [React Native Environment Setup](https://reactnative.dev/docs/environment-setup)
- [Firebase for React Native](https://rnfirebase.io/)
- [Android Build Documentation](https://reactnative.dev/docs/signed-apk-android)

---

**Note:** The Android folder is required for all React Native apps. Without it, you cannot:
- Build APK
- Use native modules (Firebase, notifications, camera, etc.)
- Run on Android devices

