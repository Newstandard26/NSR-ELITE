# NSR Elite — App Store & Google Play Submission Guide

The native iOS and Android apps are **Capacitor** shells that load the live web
app at **https://nsreliteknocker.com** inside a native WebView, with native
plugins (geolocation, splash screen) available. No web build is bundled — the
shell loads the live site, so **redeploying the website updates the apps
instantly** (you only rebuild the native app for icon/config/plugin changes).

- **Bundle ID:** `com.newstandardrestoration.nsrelite`
- **App name:** NSR Elite
- **Version:** 1.0.0 (build 1)
- **iOS target:** 16.0+   **Android:** minSdk 26 (Android 8.0+), target SDK 36

---

## Prerequisites
- **iOS:** a Mac with **Xcode 15+**. (Capacitor 8 uses Swift Package Manager, so
  **no CocoaPods needed** — Xcode resolves packages on open.)
- **Android:** **Android Studio** (Giraffe+), JDK 17+.
- This repo cloned, then once: `npm install`.

> If you ever change icons/config/plugins, re-run `npx cap sync` before building.

---

## iOS — build & upload (.ipa)
1. Open the project:
   ```bash
   npx cap open ios
   ```
   (or open `ios/App/App.xcodeproj` in Xcode). Let Swift Package Manager finish
   resolving packages.
2. Select the **App** target → **Signing & Capabilities** tab:
   - Check **Automatically manage signing**.
   - **Team:** your Apple Developer team (New Standard Restoration / Mathew
     Kennington).
   - Confirm **Bundle Identifier** = `com.newstandardrestoration.nsrelite`.
3. Select **Any iOS Device (arm64)** as the run destination (not a simulator).
4. **Product → Archive**. When it finishes, the Organizer opens.
5. **Distribute App → App Store Connect → Upload**. Follow the prompts.
6. In **App Store Connect** the build appears under the app after ~10–30 min of
   processing. Attach it to a version and submit.
   - First time: create the app record in App Store Connect with the same bundle
     ID, fill App Privacy + listing (see `docs/app-store-submission.md` and
     `docs/store-listing.md`), add a **reviewer demo login**, and for private
     rollout choose **Custom App** distribution via Apple Business Manager.

## Android — build & upload (.aab)
1. Open the project:
   ```bash
   npx cap open android
   ```
   Let Gradle sync finish.
2. **Build → Generate Signed Bundle / APK → Android App Bundle**.
3. **Create a new keystore** (first time only):
   - Click **Create new…**, choose a path like `nsr-elite-release.jks`.
   - Set a **keystore password**, a **key alias** (e.g. `nsrelite`), and a **key
     password**. **⚠️ Save the keystore file + both passwords somewhere safe and
     backed up** — losing them means you can never update the app on Play.
4. Choose the **release** build variant → **Finish**. The `.aab` is written to
   `android/app/release/`.
5. In **Google Play Console**: create the app → upload the `.aab` to a track:
   - **Internal testing** (fastest) or **Production**. For private/internal use,
     use **Internal testing** or a **managed Google Play / unlisted** release.
   - Complete the **Data safety** form, privacy policy URL, and content rating
     (see `docs/app-store-submission.md`).

---

## Updating the apps later
- **Content/feature changes** to the web app: just **redeploy the website** — the
  shells load it live, nothing to resubmit.
- **Icon / splash / plugin / native config changes:** edit, run `npx cap sync`,
  bump the version (iOS `MARKETING_VERSION`/build, Android `versionName`/
  `versionCode`), then re-archive / re-bundle and upload.

## Regenerating icons & splash
Source art lives at `assets/icon.png` (1024²) and `assets/splash.png` (2732²).
To regenerate from the brand logo: `node scripts/gen-capacitor-source.mjs`, then
`npx capacitor-assets generate --iconBackgroundColor '#0d0d0d' --splashBackgroundColor '#0d0d0d'`,
then `npx cap sync`.

---

## Important notes / intentional deviations from the spec
- **No CocoaPods:** Capacitor 8 uses Swift Package Manager, so the `ios/` project
  has no `Podfile` — this is expected and simpler.
- **Android target SDK 36 (not 34):** Google Play requires a recent target API for
  new apps; 34 would be rejected. Kept Capacitor's modern default (36).
- **No background location:** the spec listed an "Always" location string, but the
  app only uses location **in the foreground** (on the map). Adding a background-
  location permission you don't use triggers Apple's strict background-location
  review and a Google Play declaration + would likely cause rejection — so only
  **When-In-Use** location is declared. If you later add real background tracking,
  add `NSLocationAlwaysAndWhenInUseUsageDescription` (iOS) +
  `ACCESS_BACKGROUND_LOCATION` (Android) and complete the extra store reviews.
- **`ITSAppUsesNonExemptEncryption = false`** is set so you skip the export-
  compliance questionnaire on every iOS upload (standard HTTPS only).
- The app loads `https://nsreliteknocker.com` — make sure that domain stays live
  and points at the Vercel deployment.

See also: `docs/mobile-app.md`, `docs/app-store-submission.md`, `docs/store-listing.md`.
