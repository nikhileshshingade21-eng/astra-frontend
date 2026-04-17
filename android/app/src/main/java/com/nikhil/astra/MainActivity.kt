package com.nikhil.astra

import android.os.Bundle
import android.view.animation.AccelerateInterpolator
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    // 1. Install the Splash Screen BEFORE super.onCreate()
    val splashScreen = installSplashScreen()
    
    super.onCreate(savedInstanceState)

    // 2. Custom Exit Animation (Premium Fluid Transition)
    splashScreen.setOnExitAnimationListener { splashScreenView ->
        val iconView = splashScreenView.iconView
        
        // Premium Transition: Scale (0.8 -> 1.2) and Fade Out
        // Note: We use 1.2 and alpha 0 to reveal the react app smoothly behind it
        iconView.animate()
            .scaleX(1.3f)
            .scaleY(1.3f)
            .alpha(0f)
            .setDuration(500L)
            .setInterpolator(AccelerateInterpolator())
            .withEndAction {
                splashScreenView.remove()
            }
            .start()
            
        // Also fade out the background for a smooth dashboard reveal
        splashScreenView.view.animate()
            .alpha(0f)
            .setDuration(500L)
            .start()
    }
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "astra"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
