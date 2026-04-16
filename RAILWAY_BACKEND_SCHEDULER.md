# ASTRA Backend Scheduler - Railway Node.js Integration

This code should be added to your existing **Railway Node.js backend**.

## 📦 Install Dependencies

```bash
npm install node-cron firebase-admin
```

## 📄 Create `scheduler/classNotifier.js`

```javascript
/**
 * ASTRA Class Notification Scheduler
 * Automatically detects upcoming and ongoing classes
 * Sends Firebase Cloud Messaging notifications
 */

const cron = require('node-cron');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('../firebase-credentials.json'); // Download from Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// In-memory cache for sent notifications (use Redis in production)
const sentNotifications = new Map();

/**
 * Check for upcoming and ongoing classes
 */
async function checkClasses(db) {
  try {
    console.log('🔍 Checking for upcoming classes...');

    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Kolkata', // Adjust to your timezone
    });

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = dayNames[now.getDay()];

    console.log(`📅 Current time: ${currentTime}, Day: ${currentDay}`);

    // Fetch all users with timetables
    const users = await db.collection('users').find({ timetable: { $exists: true } }).toArray();

    let notificationCount = 0;

    for (const user of users) {
      const { timetable, fcm_token } = user;

      if (!fcm_token || !timetable || !timetable[currentDay]) continue;

      const todayClasses = timetable[currentDay];

      for (const classInfo of todayClasses) {
        const { subject, start_time, end_time, room } = classInfo;

        if (!start_time) continue;

        const classStart = parseTime(start_time);
        const nowMinutes = parseTime(currentTime);

        const minutesUntilClass = classStart - nowMinutes;

        // SCENARIO 1: Class starting in 10-15 minutes (reminder)
        if (minutesUntilClass >= 10 && minutesUntilClass <= 15) {
          const notificationKey = `${user._id}_${subject}_${start_time}_reminder`;

          if (!sentNotifications.has(notificationKey)) {
            await sendNotification(fcm_token, {
              title: `📚 Upcoming: ${subject}`,
              body: `Your class starts in ${minutesUntilClass} minutes at ${start_time} in ${room || 'TBA'}`,
              data: {
                type: 'class_reminder',
                class_name: subject,
                start_time,
                room: room || 'TBA',
              },
            });

            sentNotifications.set(notificationKey, Date.now());
            notificationCount++;
            console.log(`✅ Sent reminder to ${user.email} for ${subject}`);
          }
        }

        // SCENARIO 2: Class just started (0-5 minutes ago)
        if (minutesUntilClass >= -5 && minutesUntilClass <= 0) {
          const notificationKey = `${user._id}_${subject}_${start_time}_start`;

          if (!sentNotifications.has(notificationKey)) {
            await sendNotification(fcm_token, {
              title: `🔔 Class Started: ${subject}`,
              body: `Your class has started at ${start_time} in ${room || 'TBA'}. Mark your attendance!`,
              data: {
                type: 'class_start',
                class_name: subject,
                start_time,
                room: room || 'TBA',
              },
            });

            sentNotifications.set(notificationKey, Date.now());
            notificationCount++;
            console.log(`✅ Sent start notification to ${user.email} for ${subject}`);
          }
        }
      }
    }

    // Clean up old notifications (older than 1 hour)
    cleanupOldNotifications();

    console.log(`✅ Notification check complete. Sent: ${notificationCount}`);
  } catch (error) {
    console.error('❌ Error checking classes:', error);
  }
}

/**
 * Send Firebase Cloud Messaging notification
 */
async function sendNotification(fcmToken, { title, body, data }) {
  try {
    const message = {
      notification: {
        title,
        body,
      },
      data,
      token: fcmToken,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          priority: 'high',
          channelId: 'astra-class-reminders',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            contentAvailable: true,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log('📱 FCM sent:', response);
    return response;
  } catch (error) {
    console.error('❌ FCM error:', error);
    return null;
  }
}

/**
 * Parse time string (HH:MM) to minutes since midnight
 */
function parseTime(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Clean up notifications older than 1 hour
 */
function cleanupOldNotifications() {
  const oneHourAgo = Date.now() - 3600000; // 1 hour in ms

  for (const [key, timestamp] of sentNotifications.entries()) {
    if (timestamp < oneHourAgo) {
      sentNotifications.delete(key);
    }
  }
}

/**
 * Start the scheduler
 */
function startScheduler(db) {
  // Run every 2 minutes
  cron.schedule('*/2 * * * *', () => {
    checkClasses(db);
  });

  console.log('✅ Class notification scheduler started (runs every 2 minutes)');

  // Run immediately on start
  checkClasses(db);
}

module.exports = { startScheduler };
```

## 📄 Update `server.js` (or `index.js`)

Add this to your main server file:

```javascript
const { startScheduler } = require('./scheduler/classNotifier');

// After MongoDB connection is established
const db = client.db('your_database_name');

// Start class notification scheduler
startScheduler(db);
```

## 🔥 Add Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Go to **Project Settings** > **Service Accounts**
3. Click **"Generate New Private Key"**
4. Save as `firebase-credentials.json` in your backend root

## 📱 Frontend: Register FCM Token

Add this endpoint to your backend:

```javascript
app.post('/api/notifications/register-fcm', async (req, res) => {
  try {
    const { user_id, fcm_token, device_type } = req.body;

    await db.collection('users').updateOne(
      { _id: user_id },
      { $set: { fcm_token, device_type, fcm_updated_at: new Date() } }
    );

    res.json({ success: true, message: 'FCM token registered' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

## 🧪 Testing

### Test notification sending:
```bash
curl -X POST https://your-railway-backend.up.railway.app/api/notifications/test \
  -H "Content-Type: application/json" \
  -d '{
    "fcm_token": "YOUR_DEVICE_FCM_TOKEN",
    "title": "Test Notification",
    "body": "Testing ASTRA notifications!"
  }'
```

## ⚙️ Configuration

Edit timezone in `classNotifier.js`:
```javascript
timeZone: 'Asia/Kolkata' // Change to your timezone
```

Edit check interval:
```javascript
cron.schedule('*/2 * * * *', () => { // Every 2 minutes
cron.schedule('*/5 * * * *', () => { // Every 5 minutes
```

## 🚀 Deployment to Railway

Your Railway backend will automatically restart and start the scheduler when you push this code.

## ✅ Verify Scheduler is Running

Check your Railway logs:
```
✅ Class notification scheduler started (runs every 2 minutes)
🔍 Checking for upcoming classes...
📅 Current time: 09:45, Day: Monday
```

---

**That's it!** The scheduler will automatically detect classes and send notifications. 🎉
