#!/bin/bash
# ASTRA Quick Start Script
# This script helps complete the remaining setup steps

set -e

echo "🚀 ASTRA Quick Setup Script"
echo "================================"
echo ""

# Check if we're in the right directory
if [ ! -d "/app/frontend" ] || [ ! -d "/app/backend" ]; then
    echo "❌ Error: Must run from ASTRA project root"
    exit 1
fi

echo "📋 Current Setup Status:"
echo ""

# Check Firebase backend credentials
if [ -f "/app/backend/firebase-credentials.json" ]; then
    echo "✅ Backend Firebase credentials: FOUND"
else
    echo "❌ Backend Firebase credentials: MISSING"
    echo "   → Download from Firebase Console > Settings > Service Accounts"
    echo "   → Place in: /app/backend/firebase-credentials.json"
fi

# Check Frontend google-services.json
if [ -f "/app/frontend/android/app/google-services.json" ]; then
    echo "✅ Frontend google-services.json: FOUND"
else
    echo "❌ Frontend google-services.json: MISSING"
    echo "   → Download from Firebase Console when adding Android app"
    echo "   → Place in: /app/frontend/android/app/google-services.json"
fi

# Check Android native code
if [ -f "/app/frontend/android/build.gradle" ]; then
    echo "✅ Android native code: COMPLETE"
else
    echo "⚠️  Android native code: INCOMPLETE"
    echo ""
    read -p "Do you want to generate Android native code now? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "📦 Generating Android native code..."
        cd /app/frontend
        npx react-native init AstraTemp --version 0.76.9
        
        echo "📂 Copying Android folder..."
        cp -r AstraTemp/android ./android-full
        rm -rf AstraTemp
        
        if [ -d "android" ]; then
            echo "🔄 Replacing old Android folder..."
            rm -rf android
        fi
        
        mv android-full android
        echo "✅ Android native code generated!"
    fi
fi

echo ""
echo "🔍 Checking Backend..."
BACKEND_STATUS=$(curl -s http://localhost:8001/api/health 2>/dev/null | grep -o '"status":"healthy"' || echo "")
if [ -n "$BACKEND_STATUS" ]; then
    echo "✅ Backend: RUNNING"
    
    # Check scheduler
    SCHEDULER=$(curl -s http://localhost:8001/api/notifications/status | grep -o '"scheduler_running":true' || echo "")
    if [ -n "$SCHEDULER" ]; then
        echo "✅ Scheduler: ACTIVE"
    else
        echo "⚠️  Scheduler: NOT RUNNING"
    fi
    
    # Check Firebase
    FIREBASE=$(curl -s http://localhost:8001/api/notifications/status | grep -o '"firebase_enabled":true' || echo "")
    if [ -n "$FIREBASE" ]; then
        echo "✅ Firebase: ENABLED"
    else
        echo "⚠️  Firebase: SIMULATED MODE (awaiting credentials)"
    fi
else
    echo "❌ Backend: NOT RUNNING"
    echo "   → Start with: sudo supervisorctl restart backend"
fi

echo ""
echo "================================"
echo "📚 Next Steps:"
echo ""

if [ ! -f "/app/backend/firebase-credentials.json" ]; then
    echo "1. Setup Firebase (see /app/SETUP_AND_BUILD_GUIDE.md)"
fi

if [ ! -f "/app/frontend/android/build.gradle" ]; then
    echo "2. Complete Android setup (see /app/ANDROID_SETUP_REQUIRED.md)"
fi

echo ""
echo "📖 Full documentation:"
echo "   → Setup Guide: /app/SETUP_AND_BUILD_GUIDE.md"
echo "   → Verification Report: /app/FINAL_VERIFICATION_REPORT.md"
echo ""
echo "✅ Core implementation is COMPLETE!"
echo "🎯 Just need Firebase setup to enable real notifications"
echo ""
