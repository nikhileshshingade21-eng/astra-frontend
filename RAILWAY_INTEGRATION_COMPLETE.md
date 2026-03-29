# 🚂 Railway Backend Integration - Complete Guide

## 📦 Step 1: Add Dependencies

In your Railway backend's `package.json`, add these dependencies:

```json
{
  "dependencies": {
    "node-cron": "^3.0.3",
    "firebase-admin": "^12.0.0"
  }
}
```

Or run in your backend directory:
```bash
npm install node-cron firebase-admin
```

---

## 📁 Step 2: Create Scheduler File

**Create folder structure:**
```
your-railway-backend/
├── scheduler/
│   └── classNotifier.js  ← Create this file
├── firebase-credentials.json  ← Place your downloaded file here
├── index.js (or server.js)
└── package.json
```

**Copy the complete code:**

The file `classNotifier.js` is available at: `/app/scheduler-classNotifier.js`

Copy that entire file content to: `your-backend/scheduler/classNotifier.js`

---

## 🔧 Step 3: Update Your Main Server File

**In your `index.js` or `server.js`, add this:**

```javascript
// At the top with other requires
const { startScheduler } = require('./scheduler/classNotifier');

// After MongoDB connection is established
// Find this line or similar:
// const db = client.db('your_database_name');

// Add this right after DB connection:
startScheduler(db);
```

**Example full integration:**

```javascript
const express = require('express');
const { MongoClient } = require('mongodb');
const { startScheduler } = require('./scheduler/classNotifier');

const app = express();
const client = new MongoClient(process.env.MONGO_URL);

async function start() {
  await client.connect();
  console.log('✅ MongoDB connected');
  
  const db = client.db('astra'); // Your DB name
  
  // Start notification scheduler
  startScheduler(db);
  
  // Your routes here...
  
  app.listen(3000, () => {
    console.log('✅ Server running on port 3000');
  });
}

start();
```

---

## 🔥 Step 4: Add firebase-credentials.json

1. **Download from Firebase Console** (as instructed earlier)
2. **Place in your Railway backend root:**
   ```
   your-railway-backend/
   ├── firebase-credentials.json  ← HERE
   ├── scheduler/
   ├── index.js
   └── package.json
   ```

3. **For Railway deployment:**
   - Option A: Commit to GitHub (add to .gitignore for security)
   - Option B: Use Railway environment variables (paste JSON as string)

---

## 📱 Step 5: Add FCM Token Registration Endpoint

**Add this to your routes:**

```javascript
// Register FCM token when user logs in
app.post('/api/notifications/register-fcm', async (req, res) => {
  try {
    const { user_id, fcm_token, device_type } = req.body;

    await db.collection('users').updateOne(
      { _id: user_id },
      { $set: { 
        fcm_token, 
        device_type, 
        fcm_updated_at: new Date() 
      }}
    );

    res.json({ 
      success: true, 
      message: 'FCM token registered successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});
```

---

## 🚀 Step 6: Deploy to Railway

**Via GitHub:**
```bash
git add .
git commit -m "Add class notification scheduler"
git push origin main
```

Railway will automatically:
- Detect changes
- Install new dependencies
- Restart server
- Start scheduler

**Via Railway CLI:**
```bash
railway up
```

---

## ✅ Step 7: Verify It's Working

**Check Railway logs:**

1. Go to Railway dashboard
2. Click your backend service
3. Click "Deployments" → Latest deployment
4. Look for these logs:

```
✅ MongoDB connected
✅ Class notification scheduler started (runs every 2 minutes)
🔍 Checking for upcoming classes...
📅 Current time: 09:45, Day: Monday
✅ Check complete. Sent: 0 notifications
```

**Test endpoint:**
```bash
curl https://your-railway-backend.up.railway.app/health
```

---

## 🧪 Step 8: Test Notifications

**Manual test (optional):**

Add this test endpoint to your server:

```javascript
app.post('/api/notifications/test', async (req, res) => {
  const admin = require('firebase-admin');
  
  try {
    const { fcm_token, title, body } = req.body;

    const message = {
      notification: { title, body },
      token: fcm_token,
      android: { priority: 'high' }
    };

    const response = await admin.messaging().send(message);
    res.json({ success: true, response });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

**Test it:**
```bash
curl -X POST https://your-railway-backend.up.railway.app/api/notifications/test \
  -H "Content-Type: application/json" \
  -d '{
    "fcm_token": "YOUR_DEVICE_TOKEN_FROM_APP",
    "title": "Test Notification",
    "body": "ASTRA notifications working!"
  }'
```

---

## 🎯 Configuration Options

**Change timezone** (in classNotifier.js):
```javascript
timeZone: 'Asia/Kolkata'  // Change to your timezone
// Options: 'America/New_York', 'Europe/London', etc.
```

**Change check frequency:**
```javascript
cron.schedule('*/2 * * * *', () => { // Every 2 minutes (default)
cron.schedule('*/5 * * * *', () => { // Every 5 minutes
cron.schedule('* * * * *', () => {   // Every 1 minute
```

**Change notification timing:**
```javascript
// Reminder: 10-15 minutes before
if (minutesUntilClass >= 10 && minutesUntilClass <= 15) {

// Change to 5-10 minutes:
if (minutesUntilClass >= 5 && minutesUntilClass <= 10) {
```

---

## ⚠️ Important Notes

1. **Firebase credentials security:**
   - Don't commit `firebase-credentials.json` to public repos
   - Add to `.gitignore` if repo is public
   - Use environment variables in production

2. **Database field names:**
   - Scheduler expects: `fcm_token`, `timetable`, `email` fields
   - Timetable format:
     ```json
     {
       "Monday": [
         {
           "subject": "Math",
           "start_time": "09:00",
           "end_time": "10:00",
           "room": "101"
         }
       ]
     }
     ```

3. **Testing:**
   - Add yourself as test user with timetable
   - Set a class 10-15 minutes in future
   - Check Railway logs for notification

---

## 🆘 Troubleshooting

**Scheduler not running:**
- Check Railway logs for errors
- Verify `startScheduler(db)` is called after DB connection
- Check firebase-credentials.json exists

**No notifications sent:**
- Verify users have `fcm_token` in database
- Check timetable format matches expected structure
- Verify current time matches a class time
- Check Railway logs for FCM errors

**Firebase errors:**
- Verify firebase-credentials.json is valid
- Check Firebase project settings
- Ensure Cloud Messaging API is enabled

---

## ✅ Checklist

- [ ] Dependencies installed (`node-cron`, `firebase-admin`)
- [ ] `scheduler/classNotifier.js` created
- [ ] `firebase-credentials.json` placed in backend root
- [ ] `startScheduler(db)` added to main server file
- [ ] FCM registration endpoint added
- [ ] Code deployed to Railway
- [ ] Logs show scheduler running
- [ ] Test notification sent successfully

---

**Your backend scheduler is now ready to send automatic class notifications!** 🎉
