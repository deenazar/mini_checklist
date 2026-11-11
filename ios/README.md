# Mimi Checklist — iPhone app

Your daily checklist with Mimi as a real app on your iPhone: its own icon, full screen, works offline,
and Mimi can hear you (mic button and “Hey Mimi”) using iPhone speech recognition.

## What’s new in version 2.0

- **The whole checklist is inside the app.** It no longer opens claude.ai, so there’s no sign-in, and it
  works without internet (the 3D island and fonts are bundled too).
- **Your data is saved on your iPhone**, in the app’s own storage. It’s included when your iPhone backs up
  to iCloud or a computer.
- **Bring your old checklist over.** Settings › Backup › **Restore from a backup**, then pick the backup
  file made from your claude.ai checklist (see “Moving your old data” below).
- **Backups.** Settings › Backup › **Export a backup** opens the share sheet: save it to Files, AirDrop it or
  mail it to yourself. Restore it the same way on another device or in the web app.
- The island’s day labels no longer cover the date on smaller screens, and the mic tells you when your iPhone
  can’t listen in the language Mimi is set to.

Earlier: reminders as real notifications (1.1), profile photo, haptics, a self-clearing clipboard for the
password vault, microphone only for the checklist page (1.2).

**Updating from 1.x:** replace your old `MimiChecklist.swiftpm` folder with this one, open it in Xcode and press
▶ Run. Then restore your old data once (below).

## Install on your iPhone (about 5 minutes, one time)

You need: a Mac with **Xcode** (free, App Store), your iPhone, and a USB cable (first time).

1. **Open the project.** Double-click `MimiChecklist.swiftpm`. It opens in Xcode.
   (If it opens in Swift Playgrounds instead: right-click → Open With → Xcode.)
2. **Sign in to Xcode with your Apple ID** (once): Xcode → Settings → Accounts → **+** → Apple ID.
3. **Pick your team.** Click **Mimi Checklist** at the top of the left sidebar → **Signing & Capabilities**
   → Team: choose your name (Personal Team).
   If Xcode says the bundle ID is taken, change `com.azarudeen.mimichecklist` in `Package.swift`
   to anything unique, e.g. `com.yourname.mimi`.
4. **Connect your iPhone** with the cable, unlock it and tap **Trust**.
   Turn on **Developer Mode**: Settings → Privacy & Security → Developer Mode → On (the iPhone restarts).
5. **Run.** In Xcode’s top bar, choose your iPhone as the destination and press **▶ Run** (⌘R).
6. **Trust the app** the first time: on the iPhone, Settings → General → VPN & Device Management →
   your Apple ID → **Trust**. Then open **Mimi Checklist** from the Home Screen.

After that you can run it over Wi-Fi without the cable (Window → Devices and Simulators →
“Connect via network”).

## Moving your old data

Your claude.ai checklist was turned into one backup file (tasks, daily tasks, lists, water, settings, notes and
profile photo). Put that file somewhere your iPhone can reach it (AirDrop it, save it to iCloud Drive / Files,
or mail it to yourself), then in the app: **Settings › Backup › Restore from a backup** and pick the file.
Do this once; restoring again just replaces the same items.

Keep that backup file private: it holds your notes and photo.

## Good to know

- **Free Apple ID:** apps you install yourself stop opening after **7 days**. Plug in and press Run again.
  Your data is safe: it stays in the app’s storage when you reinstall over it. (Deleting the app deletes its
  data, so export a backup first.) A paid Apple Developer account (₹8,700/year) removes this limit and
  lets you share via TestFlight.
- **Voice:** the first time you tap the mic, iPhone asks for Microphone and Speech Recognition — tap Allow.
  “Hey Mimi” works while the app is open on screen.
- **Reminders** ring as iPhone notifications even when the app is closed (the next 7 days). Open the app once
  after adding or changing a reminder so it can update them.
- **Not synced between devices.** The iPhone app and the web app each keep their own data. Use Export / Restore
  to move it.

## For developers

- The app shows the web app from the repository’s `web/` folder, bundled as `Web/` in this package.
  After changing anything in `web/`, run `scripts/sync-ios-web.sh` (and `--check` to verify the copy is current).
- `NativeStore.swift` keeps the page’s data in `Application Support/MimiChecklist/store.json`. The page loads
  it each time it opens; if the file can’t be read, the page offers no saving, so the file is never overwritten.
- `AppOrigin.swift` makes the bundled page the only one that may use the native extras
  (storage, speech, notifications, haptics, clipboard, sharing). Web links open in Safari.
