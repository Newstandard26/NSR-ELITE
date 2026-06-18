# App Store Submission — NSR Elite (iOS)

Private/internal distribution via **Apple Business Manager (Custom App)**. This doc
has the **App Privacy answers**, a **step-by-step checklist**, and the **Google
Data Safety** equivalent for later.

---

## 1. Apple "App Privacy" answers (App Store Connect → App Privacy)

**Do you or your partners collect data from this app?** → **Yes.**
**Do you use data to track users?** → **No.** (No ad networks, no cross-app/site
tracking, no data brokers.) → select **"Data Not Used to Track You."**

For each type below: **Linked to the user = Yes** (tied to their account),
**Used for tracking = No**, **Purpose = App Functionality** (add **Analytics**
only where noted).

| Data type (Apple category) | Collected | Notes / purpose |
|---|---|---|
| **Precise Location** | Yes | Foreground only — map position + door logging. App Functionality. **Not** background. |
| **Photos or Videos** | Yes | Lead photos the rep captures. App Functionality. |
| **Name** | Yes | Rep account name. App Functionality. |
| **Email Address** | Yes | Login + invites. App Functionality. |
| **Phone Number / Physical Address / Other Contact Info** | Yes | Homeowner/prospect contact + property data the rep enters or pulls. App Functionality. |
| **User ID** | Yes | Account identifier. App Functionality. |
| **Product Interaction (Usage Data)** | Yes | Sign-ins / in-app activity for team analytics. App Functionality **+ Analytics**. |

Everything else (financial info, health, browsing history, contacts address book,
search history, sensitive info, diagnostics/crash via 3rd-party SDK) → **Not
collected**.

**Account deletion:** Yes — supported in-app (Profile → Delete account) and via
`info@newstandardrestoration.com`. Apple requires this answer to be accurate.

**Privacy Policy URL:** `https://<your-domain>/privacy`

---

## 2. Info.plist additions (in `ios/App/App/Info.plist`)

Permission strings (see `docs/mobile-app.md`) **plus** export compliance so you
skip the encryption questionnaire on every upload:

```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```
(We only use standard HTTPS encryption, which is exempt.)

---

## 3. App Store Connect — submission checklist

**One-time setup**
- [ ] Apple Developer Program active ($99/yr). ✅
- [ ] Create the App ID / bundle id `com.newstandardrestoration.nsrelite` (Certificates, Identifiers & Profiles).
- [ ] Create the app record in App Store Connect (same bundle id).

**Build**
- [ ] On a Mac: `export CAP_SERVER_URL="https://<prod-url>"`, `npm run cap:add:ios`, `npm run cap:sync`.
- [ ] Add Info.plist permission strings + `ITSAppUsesNonExemptEncryption`.
- [ ] Set app icon (1024×1024) and a launch screen in Xcode.
- [ ] Archive in Xcode → upload to App Store Connect.

**App information**
- [ ] Name: **NSR Elite**
- [ ] Subtitle: e.g. *Field canvassing for NSR*
- [ ] Category: **Business**
- [ ] Privacy Policy URL: `/privacy`
- [ ] Support URL: your site or `/privacy`
- [ ] Description, keywords, and **screenshots** (6.7" + 5.5" iPhone at minimum).
- [ ] Age rating questionnaire → answer all "None"; **Unrestricted Web Access = No** → rating **4+**.

**App Privacy** — enter the answers from Section 1.

**App Review Information (critical — login-gated app)**
- [ ] Provide a **working demo account** (e.g. a dedicated `reviewer@newstandardrestoration.com`, REP role, with sample leads).
- [ ] Notes to reviewer: *"Internal field-sales tool distributed privately. Sign in with the demo account. Location is used only in-foreground on the Map tab to show position and log knocks."*

**Distribution (Custom App — private)**
- [ ] In **Pricing and Availability**, choose **Private / Custom App** distribution (not public App Store).
- [ ] In **Apple Business Manager → Apps and Books**, locate the app and assign licenses to your org/users.
- [ ] Submit for review; once approved it appears privately for your team.

**Pre-submit sanity**
- [ ] Background location NOT requested (no "Always" permission). ✅
- [ ] Property-data mock shows the **"Sample data"** badge, or is turned off in prod.
- [ ] No broken links; Privacy/Terms reachable from login.

---

## 4. Google Play "Data Safety" (for when verification finishes)

Mirrors the above. In Play Console → **Data safety**:
- **Data collected & shared:** Location (precise) — App functionality; Photos —
  App functionality; Personal info (name, email, phone, address) — App
  functionality; App activity (product interaction) — Analytics.
- **Encrypted in transit:** Yes. **Users can request deletion:** Yes.
- **Account deletion URL:** `https://<your-domain>/privacy` (describes in-app +
  email deletion).
- **Location permission:** foreground only → no background-location declaration
  needed. Show the in-app prominent disclosure (already built) before requesting.
- **Target API level:** keep at the current Play minimum (34+).
- Distribute via **Internal testing / Managed Google Play** (private).
