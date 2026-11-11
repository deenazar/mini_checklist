# Mimi Checklist — iPhone app

Your daily checklist with Mimi as a real iPhone app: full screen, works offline, Mimi hears you (mic and
“Hey Mimi”), reminders ring as notifications, the running task timer lives in the **Dynamic Island** and on the
**Lock Screen**, and your checklist can sync, **encrypted**, through your Google account.

## What’s new in version 3.0

- **Real Dynamic Island & Lock Screen timer (Live Activity).** Start a task’s timer and it shows in the
  Dynamic Island and on the Lock Screen, counting live even when the app is closed. Pause or finish it and
  it goes away. (Turn off with Settings › Features › Dynamic Island.)
- **The island matches your iPhone.** On iPhones with a Dynamic Island, Mimi’s pill sits exactly over the real
  island: idle it disappears into it, with a timer it grows around it, and messages open below the camera.
- **No more white strip at the top.** The sky now runs behind the status bar.
- **Sign in with Google & sync (optional).** Your checklist is encrypted on the iPhone with a **sync password**
  you choose, then kept in a hidden app folder in your Google Drive (only this app can see it). It syncs on its
  own when things change, when you open the app, and every couple of minutes while it’s open. On a new iPhone,
  sign in, enter the same sync password, and everything comes back.
- **Welcome page** with a little motion: Continue with Google, start without an account, or restore a backup.

Earlier: data saved inside the app, backups through the share sheet (2.0), microphone only for the checklist
page (1.2), reminders as real notifications, profile photo, haptics (1.1).

## One-time setup on your Mac (about 10 minutes)

The project is now a regular Xcode project, made from `project.yml` with **XcodeGen**
(the Dynamic Island needs a widget extension, which the old `.swiftpm` format can’t have).

1. **Install XcodeGen** (needs [Homebrew](https://brew.sh)):

   ```bash
   brew install xcodegen
   ```

2. **Get the latest code:**

   ```bash
   cd ~/Desktop/mini_checklist && git pull
   ```

3. **Make your personal settings file:**

   ```bash
   cd ios && cp Config/Local.example.xcconfig Config/Local.xcconfig
   ```

   Open `ios/Config/Local.xcconfig` in a text editor and set:
   - `DEVELOPMENT_TEAM` — your Apple team ID. Print it with `./find-team-id.sh` (works once you’ve run any app
     from Xcode with your Personal Team, which you have).
   - `GOOGLE_CLIENT_ID` — only for Google sync; see the next section. Leave it as is to skip Google for now.

4. **Generate and open the project:**

   ```bash
   xcodegen && open MimiChecklist.xcodeproj
   ```

5. Choose your iPhone at the top and press **▶ Run**. (Wi-Fi works once the iPhone is paired.)

Run `xcodegen` again whenever `project.yml` changes (after a `git pull`, if Xcode complains about missing
files). Your data is safe: it stays in the app’s storage across reinstalls with the same bundle ID.

## Google sign-in setup (once, about 10 minutes)

Google needs to know about the app before it can sign you in. This is free.

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create a project, e.g. **Mimi Checklist**.
2. **APIs & Services › Library** → search **Google Drive API** → **Enable**.
3. **Google Auth Platform** (or **APIs & Services › OAuth consent screen**):
   - App name **Mimi Checklist**, your Gmail as support and contact email.
   - Audience: **External**. While it’s in **Testing**, add your Gmail under **Test users**.
   - Data access / Scopes: add `…/auth/drive.appdata` (plus `openid`, `email`, `profile`).
4. **Clients › Create client** (or **Credentials › Create credentials › OAuth client ID**):
   - Application type **iOS**.
   - Bundle ID: `com.azarudeen.mimichecklist` (or the `APP_BUNDLE_ID` you set in `Local.xcconfig`).
   - Create, then copy the **Client ID** (ends with `.apps.googleusercontent.com`).
5. Put it in `ios/Config/Local.xcconfig`:

   ```
   GOOGLE_CLIENT_ID = 1234567890-abc123.apps.googleusercontent.com
   ```

6. Run `xcodegen` again and **▶ Run**. In the app: welcome page › **Continue with Google**, or
   Settings › **Account & sync** › **Sign in with Google**.

Good to know about Google:
- While the Google project is in **Testing**, Google signs the app out after **7 days**; just sign in again
  (your sync password stays saved). Publishing the project (**Audience › Publish app**) avoids that; Google may
  show an “unverified app” notice for a personal app, which is fine for your own use.
- The app asks only for your name, email and its **own hidden folder** in Drive. It can’t see your other files.

## The sync password

- Chosen the first time you sign in. Your checklist is encrypted with it **before** it leaves the iPhone
  (PBKDF2-SHA256, 210,000 rounds, AES-256-GCM). Google stores only the encrypted file.
- It’s saved in this iPhone’s Keychain, so you type it once per device.
- **If you forget it, the synced copy can’t be opened** (not by Google, not by anyone). Your iPhone’s own data
  is still there; “Forgot password?” lets you start over: the copy in Drive is replaced with this iPhone’s
  checklist under a new password.
- How syncing merges: each day, list, note and setting keeps its newest version (deletions too). On a device’s
  first sync, the copy in Google Drive wins, so a fresh phone can’t overwrite your data with an empty day. If the
  same day is edited on two devices at the same moment, the later save wins for that day.

## Moving your old data

If you haven’t yet: Settings › Backup › **Restore from a backup** and pick the backup file made from your
claude.ai checklist. Once you sign in with Google, it syncs from then on.

## Good to know

- **Free Apple ID:** apps you install yourself stop opening after **7 days**. Press ▶ Run again (Wi-Fi is fine).
  Your data stays. Deleting the app deletes its data on the phone (with Google sync, it comes back after you
  sign in again; otherwise export a backup first).
- **Voice:** the first time you tap the mic, allow Microphone and Speech Recognition.
- **Reminders** ring as notifications even when the app is closed (the next 7 days). Open the app once after
  changing a reminder so it can update them.
- **Dynamic Island:** iOS doesn’t show your own app’s Live Activity in the island while the app is open on
  screen; Mimi’s pill covers that. Close or leave the app to see the real one. On a real iPhone, taps right on the
  camera area may not reach the app; tap the pill’s edge when it’s wider.

## For developers

- `project.yml` → XcodeGen → `MimiChecklist.xcodeproj` (not committed). Settings in `Config/App.xcconfig`,
  personal ones in `Config/Local.xcconfig` (not committed).
- Targets: **MimiChecklist** (the app) and **MimiWidgets** (widget extension with the Live Activity UI).
  `Shared/MimiTimerAttributes.swift` is in both.
- The app shows the web app from the repository’s `web/` folder, bundled as `MimiChecklist/Web/`.
  After changing `web/`, run `scripts/sync-ios-web.sh` (`--check` verifies the copy).
- `NativeStore.swift`: the page’s data in `Application Support/MimiChecklist/store.json`, plus `meta.json` with
  change times and deletions for sync. If the file can’t be read, the page offers no saving.
- `SyncEngine.swift`, `GoogleAuth.swift` (OAuth PKCE via `ASWebAuthenticationSession`, no SDK),
  `DriveClient.swift` (Drive `appDataFolder`), `SyncCrypto.swift`, `Keychain.swift`.
- `LiveActivityController.swift` + `MimiWidgets/`: the page sends the running timer through
  `mimiNative.activity(...)`; the widget draws it with live timer views, so it counts while the app is closed.
- `AppOrigin.swift`: only the bundled page may use the native extras. Web links open in Safari.
