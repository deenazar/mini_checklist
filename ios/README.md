# Mimi Checklist — iPhone app

Your daily checklist with Mimi as a real iPhone app: full screen, works offline, Mimi hears you (mic and
“Hey Mimi”), reminders ring as notifications, the running task timer lives in the **Dynamic Island** and on the
**Lock Screen**, and your checklist can sync, **encrypted**, through your Google account.

## What’s new in version 4.3

- **Up next bar**: today’s plan moved out of the list into a small bar just above the bottom bar, like a music app’s mini player. It shows the next task with a ▶ to start it (and open the focus screen), the running task with its time left, or “All done 🎉” to see your day.
- **Mimi shrinks and grows as you scroll** the task list, instead of fading away. The week chart and stats fade, the date stays.
- **Finished tasks** no longer show the “…” menu. Tap the tick to undo, swipe left to delete.
- **Settings › Account & sync** no longer shows “Signed in as …”. It shows just the sync state, Sync now and Sign out.
- Fixed: the empty water glass sat too low in the water card.

## What’s new in version 4.2

- **Water glass**: the water card and the water sheet show a glass that fills up as you drink. The water has moving waves and little bubbles. Each drink drops in, sloshes the water and bounces the glass, and the glass glows mint when you reach your goal.
- **No more “Show welcome page” in Settings.** Signing out opens the welcome page by itself, and a guest signs in from Settings › Account & sync.

## What’s new in version 4.1

- **Signing out** now goes straight back to the welcome page (sign in again, or carry on as a guest).
- **Scrolling the list** no longer slides the panel over the date: the header stops shrinking just below the date, and cards fade softly under the list header instead of being cut in half.
- **Day picker**: smaller text that always fits inside each day, with today’s pill in lavender.
- **Empty day**: plush Mimi with an “Add your first task” button (the plan card shows up once there are tasks).
- The date at the top sits in a soft glass pill so it reads on every sky, and new tasks pop in.
- **Dynamic Island and Lock Screen timer** now count DOWN the time left on the plan (25:00, 24:59 …), the same as the app. When the plan runs out they say “Time’s up” and show the extra time (+0:12). Tasks without a planned time still count up.
- **Lighter, cleaner type** (DM Sans for text, Fredoka only for headings, at lighter weights) and **flat buttons** that gently shrink when pressed.
- **More motion**: the screen settles in piece by piece, ticking a task pops a little confetti, the bottom bar icons bounce when tapped, the plan card’s progress bar shines and the water drop wobbles.

## What’s new in version 4.0: the Lilac look

A fresh look across the whole app, with everything working as before.

- **Lavender and soft ink colours**, rounded Fredoka and Nunito fonts (bundled, so they work offline), and chunky buttons that press down like real ones. Light and dark mode both follow Settings › Appearance.
- **Plush Mimi**: a softer, shaded, glossy-eyed Mimi in the header, the room and the welcome page (the Home Screen widgets keep their look for now). She still sleeps at night, wakes in the morning, follows the sky by the time of day, giggles, purrs, gets dizzy and dances, exactly as before. *Me as Mimi* still works.
- **Today’s plan card** at the top of the list: how the day is going and one button for the next step (Add a task, Start next task, Open focus or See my day).
- **Bottom bar**: Today, Notes, Room, Insights and Settings. It hides while you type or a sheet is open.
- **Easier adding**: one big “Add a task…” field with a + button; list, priority, time, reminder and Daily open while you type.
- **Water**: the drop fills as you drink, and logging a glass splashes with a “+250 ml”.
- **Focus screen**: tap *Start next task*, *Open focus* or the running time on a task. Mimi sits in a progress ring with the time left, Pause/Resume and “I’m done”. When paused, Mimi naps.
- **Day complete**: tick the last task of the day and Mimi celebrates with a trophy, confetti, your week of streaks, focus time and *Plan tomorrow*.
- The welcome page is lavender too.

## What’s new in version 3.7

- **Mimi’s room is back**, behind the new house button at the top of the home screen. Tap, tickle or stroke Mimi, feed her, play with yarn, dance.
- **Me as Mimi**: in the room, tap *Me as Mimi*, pick a photo of your face, drag and zoom it to fit, and choose Cartoon or Photo. Your face then appears in Mimi’s body in the room and on the home screen. Switch back to Mimi any time. The photo stays on the iPhone (it isn’t synced). A real 3D model from a photo needs an online AI service, so this version makes a cartoon version on the phone instead.
- **Running task on top**: the task with a running timer moves to the top of the list and is highlighted.
- **Notes as a list**: notes open as a list with search, pinned notes first and a *+ New note* button. Tap a note to edit, pin, turn it into a task or delete it.
- **Password manager** is listed under Upcoming release; the vault button stays hidden on the home screen.
- Fixed: with the Dynamic Island setting off, the top buttons sometimes slid up under the status bar.

## What’s new in version 3.6

- **Account first in Settings.** Settings now opens with Account & sync: Sign in with Google, and once you’re
  signed in, Sign out (also in Profile › Account).
- **Mimi’s voice is louder:** she now speaks through normal media playback at full volume (it follows the volume
  buttons). For a clearer, more natural voice, download an Enhanced voice (Settings › Mimi › “Make Mimi sound more
  natural”).
- **Password vault hidden for now** (set `VAULT` to `true` at the top of `web/app.js` to bring it back).
- **“Access blocked … has not completed the Google verification process” (Error 403: access_denied):** the Gmail
  you signed in with isn’t on the Google project’s Test users list. Add it in Google Cloud Console › Google Auth
  Platform › Audience › Test users (see “Google sign-in setup”).

## What’s new in version 3.5

- **Touch Mimi on the home screen.** Tap her head and she giggles, tickle her belly and she laughs, tap her tail
  and she’s grumpy, tap an ear and it twitches, stroke her and she purrs (hearts and a gentle vibration),
  double-tap for her dance, and tap lots, fast, and she gets dizzy. Just a little delight; the checklist stays
  the focus.
- **Welcome / login page:** a short animated story in three slides with vector illustrations (tasks being ticked
  off, a focus timer and water filling up, Mimi cheering with confetti). Swipe, tap the dots, or let it play,
  then Continue with Google.

## What’s new in version 3.4

- **Google sign-in is set up.** The app’s Google client ID is built in (Config/App.xcconfig), so Continue with
  Google works without editing any files. While the Google project is in Testing, only the Gmail accounts listed
  under Audience › Test users can sign in.
- **Daily planning reminder.** Settings › Reminders › “Daily planning reminder”: a notification every day at the
  time you pick (“Plan your day with Mimi 🐾”). Tapping it opens the app ready to add tasks. If iPhone
  notifications are off for Mimi, Settings shows a row that opens the iPhone Settings to turn them on.
- **About push notifications:** every Mimi notification (task reminders, the daily planning reminder) is scheduled
  on the iPhone itself, so it rings even offline and needs no server. Notifications sent *from a server* (Apple
  Push Notification service) need a paid Apple Developer account and a server to send them; there’s nothing in
  Mimi today that needs them.
- **UI fixes from a full screen-by-screen check** (iPhone 15 and SE, light and dark): welcome page cards no longer
  cover the title or Mimi, the week’s day labels no longer collide on smaller iPhones, and the Dynamic Island
  setting describes what it does now.

## What’s new in version 3.3

- **Upcoming release, redesigned.** Settings › Upcoming release shows four cards: Smart reminders, AI features,
  Voice recognition and Voice chat with Mimi. Tap one for its own intro screen with an illustration.
- **Voice recognition and voice chat are paused** until that release: the mic buttons, the Talk button and
  “Hey Mimi” are hidden (Mimi still speaks her replies). Siri’s “Talk to Mimi” opens the voice chat intro.
  To turn voice input back on, set `VOICE_INPUT` to `true` at the top of `web/app.js`.

## What’s new in version 3.2

- **Only the real Dynamic Island.** On iPhones with a Dynamic Island the app no longer draws its own island
  (that copy looked like a glitch). Your running timer shows in the real island and on the Lock Screen as a
  Live Activity. Note: iOS never shows an app’s own Live Activity in the island while that app is open on
  screen; swipe home or lock the phone to see it. In the app, Mimi’s messages appear as small notes.
- **5 widgets** (long-press the Home Screen › + › Mimi Checklist):
  - **Today** (small, and Lock Screen circle / line / inline): progress ring and what’s left.
  - **Next tasks** (medium, large): your next tasks with an **Add** button.
  - **Focus** (small): the running timer counting live, or tap to start your next task.
  - **Water** (small, and Lock Screen circle): today’s water; tap to log a glass (250 ml).
  - **Week** (medium): this week’s bars, your streak and today’s focus time.
- **Shortcuts:** “Add a task”, “Log water”, “Start focus”, “What’s left” and “Talk to Mimi” work with Siri
  (“Add a task in Mimi Checklist”), the Shortcuts app, Spotlight, the **Action button**, and **Back Tap**
  (double- or triple-tap the back of the iPhone). See “Shortcuts and Back Tap” below.
- **Battery and heat:** the home screen used to redraw the whole page 60 times a second (moving clouds) and
  blurred the sky live; it now rests when you’re not touching it. Measured idle work dropped about 8×
  (1.4 s → 0.17–0.19 s of busy time per 10 s). The microphone stops when the app leaves the screen,
  “Hey Mimi” listens on the iPhone itself (no network), and Google sync checks for other devices’ changes every
  5 minutes instead of every 90 seconds (your own changes still sync right away).

**After `git pull`, run `xcodegen` once** (new files and an App Group for the widgets), then ▶ Run.

## What’s new in version 3.1

- **New home design.** The 3D island is replaced by an illustrated sky that follows the time of day (sun, clouds,
  hills; moon and stars at night), **Mimi as a drawn character** with moods (happy, sad, sleepy at night, talking,
  watching you type) and little moves (jump, wave, dance), stars orbiting her for finished tasks, a progress ring
  while a timer runs, and the week as tappable bars.
- **Mimi sounds like a person.** She now speaks with the iPhone’s own voices, choosing the most natural one you
  have (Premium, then Enhanced), at a natural pitch. For the best voice: Settings › Mimi › “Make Mimi sound more
  natural”. Listening waits a little longer before deciding you’ve finished, and Mimi stops talking when you speak.
- **Adding a task:** tapping + with an empty box just opens the keyboard (no red error), tapping anywhere on the
  add card opens it, and the keyboard no longer covers the page. Focus outlines are a soft teal instead of red.
- **Sign out** (and sign in) now in Profile › Account, as well as Settings › Account & sync.
- **Settings › Upcoming release:** smart reminders and AI features.
- More motion: tasks cascade in when you switch days, stars burst when you finish a task, sheets and the panel
  glide in, and empty days show Mimi peeking over a card.

**After `git pull`, run `xcodegen` once** (this version adds a new file, `NativeSpeaker.swift`), then ▶ Run.

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
5. The app's client ID is already in `ios/Config/App.xcconfig`. Only if you make your own Google project,
   put yours in `ios/Config/Local.xcconfig`:

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

## Widgets

Long-press an empty spot on the Home Screen › **+** (top left) › search **Mimi Checklist** › pick a widget and
size › **Add Widget**. For the Lock Screen: long-press the Lock Screen › **Customize** › **Lock Screen** › tap
the widget area › Mimi Checklist.

Widgets share today’s summary with the app through an **App Group** (`group.<your bundle ID>`), which Xcode sets
up automatically with your team. Open the app once after installing so the widgets have something to show.
If a widget keeps saying “Open Mimi Checklist once…”, the App Group couldn’t be set up for your account:
in Xcode, check **Signing & Capabilities** for both targets (MimiChecklist and MimiWidgets) shows the same
App Group with no errors.

## Shortcuts and Back Tap

- **Siri:** “Add a task in Mimi Checklist”, “Log water in Mimi Checklist”, “Start focus in Mimi Checklist”,
  “What’s left in Mimi Checklist”, “Talk to Mimi Checklist”.
- **Shortcuts app:** the same five actions are under **Mimi Checklist**; combine them with anything.
- **Action button** (iPhone 15 Pro and later): Settings › **Action Button** › **Shortcut** › Mimi Checklist ›
  pick an action (e.g. Log water).
- **Back Tap** (double-tap the back of the iPhone):
  1. In the **Shortcuts** app tap **+**, search **Mimi Checklist**, add an action (e.g. **Log water**), name it.
  2. Settings › **Accessibility** › **Touch** › **Back Tap** › **Double Tap** (or Triple Tap) › choose that shortcut.

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
