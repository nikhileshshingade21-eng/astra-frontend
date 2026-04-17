package com.nikhil.astra

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * ─────────────────────────────────────────────────────────────
 *  ASTRA App Update Package
 * ─────────────────────────────────────────────────────────────
 *  Registers the AppUpdateModule so React Native can access
 *  native download/install functionality via NativeModules.
 * ─────────────────────────────────────────────────────────────
 */
class AppUpdatePackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(AppUpdateModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
