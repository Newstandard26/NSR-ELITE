# NSR Elite — iOS & Android (Capacitor)

The mobile apps are a **Capacitor** shell that loads the live deployed web app
(`server.url` in `capacitor.config.ts`) with **native plugins** available
(geolocation handled by `@capacitor/geolocation` via `lib/native.ts`). The
server-rendered Next.js app can't be statically exported, so we load it remotely
— this is fine for our **private/internal** distribution.

## Prerequisites
- **iOS:** a **Mac** with **Xcode** + CocoaPods (`sudo gem install cocoapods`).
- **Android:** **Android Studio** (+ JDK).
- Node 18+ and this repo cloned.

## One-time setup (per machine)
```bash
npm install
export CAP_SERVER_URL="https://<your-production-url>"   # the deployed app URL
npm run cap:add:ios       # generates ios/  (Mac only)
npm run cap:add:android   # generates android/
npm run cap:sync          # applies capacitor.config.ts + plugins
```
Commit the generated `ios/` and `android/` folders.

> Set `CAP_SERVER_URL` to your real production domain (e.g. the Vercel URL or
> `app.newstandardrestoration.com`) **before** `cap:sync`, or update
> `capacitor.config.ts` directly.

## Required native permission strings
The OS rejects builds that use a permission without a usage string.

**iOS — `ios/App/App/Info.plist`** (add inside the top `<dict>`):
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>NSR Elite uses your location to show you on the canvassing map and log doors you knock.</string>
<key>NSCameraUsageDescription</key>
<string>NSR Elite uses the camera to attach photos to a lead.</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>NSR Elite saves lead photos you capture.</string>
```
We only use location **while the app is in use** — do **not** add
`NSLocationAlwaysAndWhenInUseUsageDescription` (that triggers the much stricter
background-location review).

**Android — `android/app/src/main/AndroidManifest.xml`:**
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.CAMERA" />
```
Do **not** add `ACCESS_BACKGROUND_LOCATION`. Keep `targetSdkVersion` at the
current Play minimum (34+).

## Build & run
```bash
npm run cap:ios       # opens Xcode → run on simulator/device
npm run cap:android   # opens Android Studio → run
```
After any web change you just redeploy the site — the shell loads it live. You
only rebuild the native app when Capacitor config/plugins/icons change.

## App icons & splash
Drop a 1024×1024 icon and run [`@capacitor/assets`](https://github.com/ionic-team/capacitor-assets)
to generate all sizes, or set them in Xcode / Android Studio.

## Private / internal distribution (our path)
**iOS — Custom App (Apple Business Manager):**
1. Archive in Xcode → upload to App Store Connect.
2. In App Store Connect, set the app to **"Custom App"** (unlisted) distribution.
3. In **Apple Business Manager**, find the app under **Apps and Books** and assign
   it to your org / users. Installs via the users' managed Apple IDs or a link.
   - This avoids the public-listing **Guideline 4.2** review that rejects most
     wrapped web apps.

**Android — Managed/closed testing or unlisted:**
1. Build a signed AAB in Android Studio.
2. In **Play Console**, upload to **Internal testing** (or Managed Google Play /
   an **unlisted** release for org-only access).
3. Add testers by email or distribute the opt-in link.

## Still required before submitting (tracked separately)
Even for private distribution both stores require:
- **Privacy Policy** URL (in-app + store listing).
- **In-app account deletion** + a public deletion-request URL (Google).
- **Location prominent disclosure** + consent before the first GPS request.
- **App Privacy labels** (Apple) / **Data Safety form** (Google) — declare:
  precise location, photos, contact info (homeowner PII), identifiers.
- A **reviewer/demo login** in the submission notes (the app is login-gated).
- Ensure the **property-data mock** is disabled in production (or labeled
  "SAMPLE") so fake owner/contact data isn't mistaken for real.

See the compliance checklist for these items.
