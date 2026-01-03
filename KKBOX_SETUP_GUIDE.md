# KKBOX OAuth Backend Setup Guide

## 🎯 Overview

This guide walks you through setting up the Firebase Cloud Functions backend proxy to enable **real KKBOX playback** in your app (bypassing CORS limitations).

---

## 📋 Prerequisites

- Firebase project with Blaze plan (required for Cloud Functions)
- KKBOX Developer account
- Node.js 18+ installed
- Firebase CLI installed

---

## 🔑 Step 1: Get KKBOX API Credentials

### 1.1 Register as KKBOX Developer
1. Go to [KKBOX Developer Portal](https://developer.kkbox.com/)
2. Sign up or log in with your KKBOX account
3. Create a new application

### 1.2 Get Client Credentials
1. After creating your app, you'll receive:
   - **Client ID**: Your application identifier
   - **Client Secret**: Your application secret key
2. Copy these credentials (you'll need them in Step 3)

### 1.3 Note Your Territory
KKBOX operates in different territories (regions):
- **TW**: Taiwan 🇹🇼
- **HK**: Hong Kong 🇭🇰
- **SG**: Singapore 🇸🇬
- **MY**: Malaysia 🇲🇾
- **JP**: Japan 🇯🇵

The default in our code is `TW` (Taiwan).

---

## ⚙️ Step 2: Configure Cloud Functions

### 2.1 Set Environment Variables

**Option A: Using Firebase CLI (Recommended)**
```bash
cd kcis-connect-main/functions

# Set KKBOX credentials
firebase functions:secrets:set KKBOX_CLIENT_ID
# Paste your client ID when prompted

firebase functions:secrets:set KKBOX_CLIENT_SECRET
# Paste your client secret when prompted
```

**Option B: Using .env file (Local Development)**
```bash
cd functions
cp .env.example .env
```

Edit `.env` and add your credentials:
```
KKBOX_CLIENT_ID=your_actual_client_id
KKBOX_CLIENT_SECRET=your_actual_client_secret
```

⚠️ **NEVER commit `.env` to git!** It's already in `.gitignore`.

---

## 🚀 Step 3: Deploy Cloud Functions

### 3.1 Build and Deploy
```bash
cd c:\Users\huach\Downloads\Code\kcis-connect-main\kcis-connect-main

# Deploy only functions
firebase deploy --only functions
```

This will deploy three functions:
- `kkboxSearch` - Search tracks
- `kkboxTrack` - Get track details
- `kkboxNewReleases` - Get new releases

### 3.2 Note Your Function URLs
After deployment, you'll see URLs like:
```
✔ functions[kkboxSearch(us-central1)] https://us-central1-kcismedia-3ad38.cloudfunctions.net/kkboxSearch
✔ functions[kkboxTrack(us-central1)] https://us-central1-kcismedia-3ad38.cloudfunctions.net/kkboxTrack
✔ functions[kkboxNewReleases(us-central1)] https://us-central1-kcismedia-3ad38.cloudfunctions.net/kkboxNewReleases
```

Copy the base URL (everything before `/kkboxSearch`):
```
https://us-central1-kcismedia-3ad38.cloudfunctions.net
```

---

## 🔧 Step 4: Update Frontend Configuration

### 4.1 Create/Update .env file
```bash
cd kcis-connect-main
```

Edit `.env` or `.env.local` and add:
```
VITE_KKBOX_PROXY_URL=https://us-central1-kcismedia-3ad38.cloudfunctions.net
```

Replace with your actual Cloud Functions URL from Step 3.2.

### 4.2 Rebuild Frontend
```bash
npm run build
firebase deploy --only hosting
```

---

## ✅ Step 5: Test KKBOX Integration

### 5.1 Test in Browser
1. Open your deployed app
2. Go to any Music Room in a club
3. Search for a song
4. You should now see KKBOX results with actual playback URLs!

### 5.2 Test Cloud Functions Directly
Test the search endpoint:
```bash
curl "https://YOUR_FUNCTION_URL/kkboxSearch?q=周杰倫&territory=TW&limit=5"
```

Expected response:
```json
{
  "tracks": [
    {
      "id": "...",
      "name": "...",
      "artist": "周杰倫",
      "album": "...",
      "image": "...",
      "duration": 240,
      "previewUrl": "...",
      "kkboxUrl": "...",
      "source": "kkbox"
    }
  ],
  "total": 100
}
```

### 5.3 Check Logs
View Cloud Functions logs:
```bash
firebase functions:log
```

Or in Firebase Console:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Functions** → **Logs**

---

## 🎵 How It Works

### Architecture
```
Frontend (React)
    ↓
    | HTTP Request
    ↓
Cloud Functions (Node.js)
    ↓
    | OAuth 2.0 (Client Credentials)
    ↓
KKBOX API
    ↓
    | JSON Response
    ↓
Cloud Functions
    ↓
    | Transform Data
    ↓
Frontend (React)
```

### OAuth Flow
1. **Cold Start**: Cloud Function requests access token from KKBOX
2. **Token Caching**: Token stored in memory (valid ~1 hour)
3. **Reuse**: Subsequent requests use cached token
4. **Refresh**: New token requested when expired

### CORS Bypass
- Direct browser → KKBOX API = ❌ CORS Error
- Browser → Cloud Functions → KKBOX API = ✅ Works!

---

## 🔒 Security Notes

### What's Safe
✅ Client Credentials Flow is server-side only  
✅ Credentials stored as Firebase Secrets  
✅ CORS enabled only for your domain  
✅ Access token cached server-side (not exposed)

### Best Practices
1. **Never commit credentials** to git
2. **Use Firebase Secrets** for production
3. **Restrict CORS** to your domain (update `cors` config)
4. **Monitor usage** in Firebase Console
5. **Set spending limits** in Firebase (Blaze plan)

### Restrict CORS (Optional)
Edit `functions/index.js` to restrict origins:
```javascript
const cors = require("cors")({
  origin: ["https://your-app.web.app", "https://your-app.firebaseapp.com"]
});
```

---

## 💰 Cost Considerations

### Firebase Cloud Functions Pricing
- **Free Tier**: 2M invocations/month, 400K GB-seconds
- **Beyond Free**: $0.40/million invocations
- **Typical Usage**: Music search ~100KB response = very cheap

### Optimization Tips
1. **Token Caching**: Reduces KKBOX API calls (already implemented)
2. **Client-Side Caching**: Cache search results in frontend
3. **Rate Limiting**: Implement if needed (not done yet)

### Monitor Costs
Firebase Console → Functions → Usage & Billing

---

## 🐛 Troubleshooting

### Error: "KKBOX credentials not configured"
**Solution**: Make sure you set secrets in Step 2.1
```bash
firebase functions:secrets:set KKBOX_CLIENT_ID
firebase functions:secrets:set KKBOX_CLIENT_SECRET
```

### Error: "KKBOX auth failed: 401"
**Causes**:
- Invalid Client ID or Secret
- Credentials not set correctly

**Solution**: Double-check credentials in KKBOX Developer Portal

### Error: "CORS policy blocked"
**Causes**:
- CORS not configured in Cloud Functions
- Wrong proxy URL in frontend

**Solution**: 
1. Check `cors` import in `functions/index.js`
2. Verify `VITE_KKBOX_PROXY_URL` in `.env`

### No KKBOX results, only iTunes
**Causes**:
- `VITE_KKBOX_PROXY_URL` not set
- Cloud Functions not deployed
- KKBOX API down

**Solution**:
1. Check `.env` has correct proxy URL
2. Run `firebase deploy --only functions`
3. Check logs: `firebase functions:log`

### Function deployment fails
**Causes**:
- Not on Blaze plan
- Node.js version mismatch

**Solution**:
1. Upgrade to Blaze plan in Firebase Console
2. Check `functions/package.json` engine version matches your Node.js

---

## 📚 API Reference

### Cloud Functions Endpoints

#### 1. Search Tracks
```
GET /kkboxSearch?q={query}&territory={TW|HK|SG|MY|JP}&limit={number}
```

**Parameters**:
- `q` (required): Search query
- `territory` (optional): Region code (default: TW)
- `limit` (optional): Max results (default: 20)

**Response**:
```json
{
  "tracks": [...],
  "total": 123
}
```

#### 2. Get Track Details
```
GET /kkboxTrack?id={track_id}&territory={TW|HK|SG|MY|JP}
```

**Parameters**:
- `id` (required): KKBOX track ID
- `territory` (optional): Region code (default: TW)

**Response**:
```json
{
  "id": "...",
  "name": "...",
  "artist": "...",
  ...
}
```

#### 3. Get New Releases
```
GET /kkboxNewReleases?territory={TW|HK|SG|MY|JP}&limit={number}
```

**Parameters**:
- `territory` (optional): Region code (default: TW)
- `limit` (optional): Max results (default: 20)

**Response**: KKBOX API format (see KKBOX docs)

---

## 🎓 Next Steps

### Enhance Functionality
- [ ] Add user authentication to Cloud Functions
- [ ] Implement rate limiting
- [ ] Add track caching (Firestore/Redis)
- [ ] Support user playlists
- [ ] Add lyrics fetching via KKBOX API

### UI Improvements
- [ ] Show KKBOX badge on tracks
- [ ] Add "Play on KKBOX" button with actual playback
- [ ] Integrate KKBOX player widget
- [ ] Add queue management with KKBOX tracks

### Monitoring
- [ ] Set up Cloud Functions monitoring
- [ ] Add error tracking (Sentry)
- [ ] Monitor KKBOX API quota
- [ ] Set spending alerts

---

## 📞 Support Resources

- **KKBOX Developer Docs**: https://docs-en.kkbox.codes/
- **Firebase Functions Docs**: https://firebase.google.com/docs/functions
- **Firebase Secrets Docs**: https://firebase.google.com/docs/functions/config-env

---

## 🎉 You're Done!

Your app now has a **working KKBOX integration** with:
✅ Real KKBOX search results  
✅ Actual playback URLs  
✅ No CORS issues  
✅ Secure OAuth handling  
✅ Cost-effective caching

Users can now search and play songs from KKBOX directly in your Music Rooms! 🎵

---

## 📝 Summary Checklist

- [ ] Created KKBOX Developer account
- [ ] Got Client ID and Secret
- [ ] Set Firebase secrets or .env
- [ ] Deployed Cloud Functions
- [ ] Added proxy URL to frontend .env
- [ ] Rebuilt and deployed frontend
- [ ] Tested search in app
- [ ] Verified logs for errors
- [ ] Set spending limits (optional)
- [ ] Restricted CORS (optional)

If all checked, you're good to go! 🚀
