#!/bin/bash
# ASTRA Quick Setup & Build Script

set -e

echo "🚀 ASTRA React Native - Quick Setup"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check current directory
if [ ! -f "/app/package.json" ]; then
    echo -e "${RED}❌ Error: Must run from ASTRA project root (/app)${NC}"
    exit 1
fi

echo "📋 Setup Checklist:"
echo ""

# 1. Check Android folder
if [ -d "/app/android" ] && [ -f "/app/android/build.gradle" ]; then
    echo -e "${GREEN}✅ Android native code: COMPLETE${NC}"
else
    echo -e "${RED}❌ Android native code: MISSING${NC}"
    echo "   Run: cd /app && npx @react-native-community/cli init AstraTemp --version 0.76.9 --skip-install"
    exit 1
fi

# 2. Check Firebase google-services.json
if [ -f "/app/android/app/google-services.json" ]; then
    echo -e "${GREEN}✅ google-services.json: FOUND${NC}"
else
    echo -e "${YELLOW}⚠️  google-services.json: MISSING${NC}"
    echo "   → Download from Firebase Console"
    echo "   → Place in: /app/android/app/google-services.json"
    echo "   → Template available: /app/android/app/google-services.json.template"
    echo ""
    read -p "Continue without Firebase? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 3. Check dependencies
echo ""
echo "📦 Installing dependencies..."
cd /app
yarn install --silent 2>&1 | grep -E "success|error" || true

echo ""
echo "🔧 Build Options:"
echo ""
echo "1. Run on Device/Emulator (Development)"
echo "2. Build APK (Local - requires JDK)"
echo "3. Build APK (EAS Cloud - requires Expo account)"
echo "4. Skip build"
echo ""
read -p "Select option (1-4): " option

case $option in
    1)
        echo ""
        echo "🏃 Starting Metro Bundler..."
        echo "   In another terminal, run: cd /app && yarn android"
        yarn start
        ;;
    2)
        echo ""
        echo "🏗️ Building APK locally..."
        cd /app/android
        
        # Check if keystore exists
        if [ ! -f "app/astra-release-key.keystore" ]; then
            echo ""
            echo "🔑 Generating release keystore..."
            keytool -genkeypair -v -storetype PKCS12 \
              -keystore app/astra-release-key.keystore \
              -alias astra-key \
              -keyalg RSA \
              -keysize 2048 \
              -validity 10000 \
              -dname "CN=ASTRA, OU=Mobile, O=ASTRA, L=City, S=State, C=IN"
            
            echo ""
            echo "📝 Creating gradle.properties..."
            cat > gradle.properties << EOF
ASTRA_UPLOAD_STORE_FILE=astra-release-key.keystore
ASTRA_UPLOAD_KEY_ALIAS=astra-key
ASTRA_UPLOAD_STORE_PASSWORD=astra123
ASTRA_UPLOAD_KEY_PASSWORD=astra123
EOF
        fi
        
        echo "🧹 Cleaning..."
        ./gradlew clean
        
        echo "📦 Building release APK..."
        ./gradlew assembleRelease
        
        APK_PATH="/app/android/app/build/outputs/apk/release/app-release.apk"
        if [ -f "$APK_PATH" ]; then
            echo ""
            echo -e "${GREEN}✅ APK built successfully!${NC}"
            echo "📍 Location: $APK_PATH"
            echo "📊 Size: $(du -h $APK_PATH | cut -f1)"
            echo ""
            echo "Install with: adb install $APK_PATH"
        else
            echo -e "${RED}❌ APK build failed. Check logs above.${NC}"
        fi
        ;;
    3)
        echo ""
        echo "☁️ Building APK with EAS..."
        
        # Check if EAS CLI is installed
        if ! command -v eas &> /dev/null; then
            echo "📥 Installing EAS CLI..."
            npm install -g eas-cli
        fi
        
        echo "🔐 Please login to Expo..."
        eas login
        
        echo "🏗️ Starting cloud build..."
        eas build --platform android --profile preview
        
        echo ""
        echo "✅ Build started! Check your Expo dashboard for progress."
        echo "   https://expo.dev/accounts/[your-account]/projects/astra/builds"
        ;;
    4)
        echo "Skipping build."
        ;;
    *)
        echo "Invalid option."
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "📚 Documentation:"
echo "   • Build Guide: /app/BUILD_GUIDE.md"
echo "   • Backend Scheduler: /app/RAILWAY_BACKEND_SCHEDULER.md"
echo ""
echo "🎯 Next Steps:"
echo "   1. Setup Firebase (if not done)"
echo "   2. Add scheduler to Railway backend"
echo "   3. Test notifications"
echo ""
