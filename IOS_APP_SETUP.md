# iOS App (App Store) Setup — Capacitor + Firebase

This repo is a Vite/React web app. To ship an iOS app (App Store) while reusing the same UI and Firebase backend, the most direct path is **Capacitor**.

## What was added in this repo
- Capacitor config: `capacitor.config.ts`
- npm scripts:
  - `npm run build:cap` (build web)
  - `npm run cap:sync` (sync web -> native)
  - `npm run cap:open:ios` (open Xcode project)

## Important constraint (Windows)
You **cannot build/sign an iOS app on Windows**. You need one of:
- A Mac with Xcode (recommended)
- A cloud Mac CI (GitHub Actions macOS runner, Codemagic, etc.)

## Step 1 — Apple prerequisites
- Apple Developer Program membership (paid)
- A unique Bundle ID (we set `com.campusmedia.app` as a placeholder)

## Step 2 — Create iOS platform (run on Mac)
From the project root:

```bash
npm install
npm run build:cap
npx cap add ios
npm run cap:sync
npm run cap:open:ios
```

In Xcode:
- Set Signing Team
- Ensure Bundle Identifier matches your Apple Developer App ID

## Step 3 — Add Firebase iOS app
In Firebase Console (`campusmedia-01`):
- Add app -> iOS
- Use the same Bundle ID as Xcode
- Download `GoogleService-Info.plist`
- Put it into the iOS project (Xcode will prompt to add to the app target)

## Step 4 — Push notifications (FCM) overview
To do push notifications on iOS you need:
- APNs key/cert in Apple Developer
- Upload APNs auth key to Firebase
- Add Firebase Messaging support to the native shell

For Capacitor, a common approach is a plugin such as:
- `@capacitor-firebase/messaging`

High-level steps (on Mac):
1. Install plugin + sync
2. Enable Push Notifications capability in Xcode
3. Configure APNs in Apple + Firebase
4. Request permission in the app and get FCM token

## Notes for this project
- Your app already uses Firebase Auth/Firestore. Those continue to work inside the iOS app.
- YouTube playback inside an iOS WebView may have additional autoplay restrictions; we already added user-gesture enablement.

If you tell me whether you have access to a Mac (or want cloud build), I can tailor the exact commands and CI setup.
