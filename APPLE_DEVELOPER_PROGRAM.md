# Apple Developer Program (What/Why) — for iOS App Store + Push

## What is it?
**Apple Developer Program** is Apple’s paid account that lets you:
- Sign iOS apps (required for installing on real devices beyond basic local testing)
- Upload builds to **TestFlight**
- Publish to the **App Store**
- Use iOS push notifications via **APNs** (needed for Firebase Cloud Messaging on iOS)

Typical cost: **USD $99/year** (Apple may have other programs for organizations/education).

## Why you need it for your project
You said:
1) You want App Store
2) You want push notifications

Both require Apple Developer Program:
- App Store/TestFlight requires signing + App Store Connect access
- Push notifications require APNs keys/certs (Apple Developer portal), which Firebase uses to deliver FCM pushes to iOS

Without it, we can still generate an **unsigned** iOS archive in GitHub Actions, but we cannot ship it to TestFlight/App Store.

## What is a Bundle ID?
A **Bundle ID** is the unique identifier for your iOS app, like:
- `com.yourname.campusmedia`
- `com.yourschool.campusmedia`

It must be **globally unique** and should match your organization/domain.

### Suggested choice (safe default)
If you don’t have a company domain yet, use a personal-style ID:
- `com.huach.campusmedia`

You can change it later, but changing Bundle ID can break push tokens and some app continuity; best to pick once.

## Enroll steps (high level)
1. Create/confirm Apple ID
2. Enroll in Apple Developer Program
3. Create an App ID with your Bundle ID
4. Create signing assets (certificate + provisioning profile)
5. (For push) Create an **APNs Auth Key**

After that, we’ll update the GitHub Actions workflow to:
- Import signing cert/profile from GitHub Secrets
- Build a signed `.ipa`
- Upload to TestFlight via fastlane + App Store Connect API key
