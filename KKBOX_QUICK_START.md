# 🎵 KKBOX Quick Setup Card

## Prerequisites
- [ ] Firebase Blaze plan enabled
- [ ] KKBOX Developer account

---

## Step 1: Get KKBOX Credentials (5 min)
1. Go to https://developer.kkbox.com/
2. Create app → Copy **Client ID** and **Client Secret**

---

## Step 2: Automated Setup (2 min)

### Windows PowerShell
```powershell
cd c:\Users\huach\Downloads\Code\kcis-connect-main\kcis-connect-main
.\setup-kkbox.ps1
```

### Mac/Linux
```bash
cd kcis-connect-main
chmod +x setup-kkbox.sh
./setup-kkbox.sh
```

The script will:
- ✅ Create `.env` file with credentials
- ✅ Set Firebase secrets for production
- ✅ Deploy Cloud Functions
- ✅ Show you the function URL

---

## Step 3: Configure Frontend (2 min)
1. Copy function URL from deployment output
2. Add to `.env`:
   ```
   VITE_KKBOX_PROXY_URL=https://us-central1-YOUR-PROJECT.cloudfunctions.net
   ```
3. Rebuild and deploy:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

---

## Done! 🎉

Test it:
1. Open any Music Room
2. Search for a song
3. See KKBOX results! 🎵

---

## Manual Setup (if script fails)

### Set Secrets
```bash
firebase functions:secrets:set KKBOX_CLIENT_ID
# Paste: your_client_id

firebase functions:secrets:set KKBOX_CLIENT_SECRET
# Paste: your_client_secret
```

### Deploy
```bash
firebase deploy --only functions
```

### Configure
Add to `.env`:
```
VITE_KKBOX_PROXY_URL=https://YOUR-FUNCTION-URL
```

---

## Troubleshooting

**"Credentials not configured"**
→ Run: `firebase functions:secrets:set KKBOX_CLIENT_ID`

**"CORS blocked"**
→ Check: `npm install cors` in `functions/` directory

**"Still seeing iTunes results"**
→ Check: `VITE_KKBOX_PROXY_URL` in `.env` and rebuild

---

## Cost
~$0.04 per 100,000 searches (essentially free)

---

## Full Guide
See `KKBOX_SETUP_GUIDE.md` for detailed instructions
