import ForegroundService from '@supersami/rn-foreground-service';

/**
 * Starts the ASTRA sticky foreground service to prevent Android
 * from killing the app during active instruction hours (8AM - 5PM).
 */
export const startAstraService = async () => {
  try {
    ForegroundService.start({
      id: 1244,
      title: "ASTRA Active",
      message: "Monitoring classes & alerts instantly",
      icon: "ic_launcher",
    });
    console.log('[ForegroundService] ASTRA Shield Activated');
  } catch (error) {
    console.warn('[ForegroundService] Start failed:', error);
  }
};

/**
 * Stops the ASTRA foreground service, intended for use
 * during night hours to save battery.
 */
export const stopAstraService = async () => {
  try {
    ForegroundService.stop();
    console.log('[ForegroundService] ASTRA Shield Deactivated (Night Mode)');
  } catch (error) {
    console.warn('[ForegroundService] Stop failed:', error);
  }
};
