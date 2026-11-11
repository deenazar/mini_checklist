# Mimi Checklist — iPhone app

Your daily checklist with Mimi, as a real app on your iPhone: its own icon, full screen,
stays signed in, and Mimi can hear you (mic button and “Hey Mimi”) using iPhone speech recognition.

## What’s new in version 1.2

- **Microphone only for your checklist.** Only Claude’s own pages can use the mic, speech, notifications,
  haptics and clipboard. Other sites shown inside the page are refused.
- **No wrong-language listening.** If iPhone can’t recognise the language Mimi is set to, the mic says so
  instead of quietly listening in English.
- **Your music comes back.** After you use the mic, music in other apps returns to full volume.
- **Stopping the mic early works.** Tapping stop while iPhone is still asking for permission no longer
  starts listening afterwards.

## What’s new in version 1.1

- **Reminders ring even when the app is closed.** Task reminders (for the next 7 days) are handed to iOS
  as real notifications with sound, on the lock screen too. The first time, iPhone asks to allow
  notifications: tap **Allow**. Open the app once after adding or changing a reminder so it can update them.
- **Profile photo.** Tap the round avatar at the top right to pick a photo from your library or take a new one
  (iPhone asks for Photos or Camera access the first time).
- **Haptics.** Reminders, water nudges and task actions now tap your iPhone with gentle vibrations.
- **Google sign-in, handled.** Tapping “Continue with Google” no longer lands on Google’s error page. The app
  explains it and takes you straight to the email sign-in (see Signing in below).
- **Password vault copy** works in the app, and a copied password clears from the clipboard after 60 seconds.
- Everything else that’s new on the checklist page (lists, Backup list, moving tasks between days, daily time
  totals, the vault, Mimi in Tamil, Malayalam, Telugu and Hindi, Dynamic Island on/off, the scroll fix) shows
  up in the app on its own. Pull down to refresh.

**Updating from 1.0:** replace your old `MimiChecklist.swiftpm` folder with this one, open it in Xcode, and press
▶ Run with your iPhone connected. Your tasks are safe: they live in your checklist, not in the app.

## Install on your iPhone (about 5 minutes, one time)

You need: this Mac with **Xcode** (free, App Store), your iPhone, and a USB cable (first time).

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

## Signing in

The app opens your checklist on claude.ai. **Sign in with your email** (claude.ai sends you a code).
Google doesn’t allow its sign-in button inside apps that show web pages like this one, so
“Continue with Google” won’t work here. Use the email option with the **same email address** as your
Claude account (your Google one, if that’s how you signed up). It opens the same checklist, and you stay
signed in after that.

## Good to know

- **Free Apple ID:** apps you install yourself stop opening after **7 days**. Just plug in and press Run
  again (your data is safe — it lives in your checklist, not in the app).
  A paid Apple Developer account (₹8,700/year) removes this limit and lets you share via TestFlight.
- **Voice:** the first time you tap the mic, iPhone asks for Microphone and Speech Recognition — tap Allow.
  “Hey Mimi” works while the app is open on screen.
- **Updates:** changes to your checklist page show up in the app automatically — no reinstall needed.
  Pull down on the page to refresh.
- The Dynamic Island animation and Mimi’s voice come from the page, so they show while the app is open.
  Reminder notifications work when the app is closed (see version 1.1 above).
