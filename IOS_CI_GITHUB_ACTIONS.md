# iOS App without a Mac — GitHub Actions (Capacitor)

You can build iOS in the cloud using GitHub Actions macOS runners.

This repo includes a starter workflow:
- `.github/workflows/ios-build.yml`

## What it does today
- Builds the web app (`npm run build:cap`)
- Generates + syncs the iOS Capacitor project (`npx cap add ios` + `npx cap sync ios`)
- Runs `pod install`
- Produces an **unsigned** `.xcarchive` artifact

Unsigned build is intentional because **App Store upload requires Apple signing assets**.

## To actually ship to TestFlight/App Store
You need Apple Developer Program + signing.

### Option 1 (common): Import signing cert + provisioning profile via GitHub Secrets
Create these GitHub Secrets:
- `IOS_CERT_P12_BASE64`: base64 of your `.p12` signing certificate
- `IOS_CERT_P12_PASSWORD`: password for the `.p12`
- `IOS_PROFILE_MOBILEPROVISION_BASE64`: base64 of your `.mobileprovision`
- `IOS_KEYCHAIN_PASSWORD`: any random password (used for CI keychain)
- `IOS_TEAM_ID`: your Apple Team ID

Then update the workflow to:
1. Create an ephemeral keychain
2. Import the p12 cert into it
3. Install the provisioning profile
4. Run `xcodebuild archive` with signing enabled
5. Export an `.ipa`
6. Upload to TestFlight

### Upload to TestFlight
The easiest reliable way in CI is **fastlane** using an App Store Connect API key.
You’ll create these secrets:
- `APPSTORE_API_KEY_ID`
- `APPSTORE_API_ISSUER_ID`
- `APPSTORE_API_PRIVATE_KEY_P8_BASE64`

Then CI can run `fastlane pilot upload`.

## Firebase push notifications (FCM) on iOS
Even if the app UI is web-based, iOS push requires native config:
1. Create an APNs key in Apple Developer
2. Upload APNs auth key in Firebase Console (campusmedia-01)
3. Add iOS app to Firebase and include `GoogleService-Info.plist` in the native project
4. Add a Capacitor push/messaging plugin (e.g. `@capacitor-firebase/messaging`) and request permission

## Next step (you choose)
Tell me:
1) Do you already have an Apple Developer Program account?
2) Do you already have a Bundle ID you want to use (e.g. `com.yourorg.campusmedia`)?

With those, I can:
- Update the workflow to do **signed** builds
- Add a `fastlane` lane to upload to TestFlight
- Add the recommended Capacitor plugin wiring for FCM
