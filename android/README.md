# Mimi Checklist for Android

The Android app shows the same checklist screens as the iPhone app (the `web/` folder, copied into the app when you build). Android-only features:

- **Timer notification.** The running task appears as an ongoing "Focusing" notification that counts down the time left. When the plan runs out it says "Time's up" and counts the extra time. A heads-up alert also fires when the time runs out, even if the app is closed.
- **Reminders.** Task reminders, water reminders and the daily planning reminder arrive as Android notifications. Android 13+ asks for permission once, and the reminders come back after the phone restarts.
- **Mimi's voice.** The phone's text-to-speech reads Mimi's lines, plus vibration, copy, and a share sheet for backups. Restoring a backup uses the system file picker.
- **Back button.** Back closes the open sheet, the Room, the Focus screen or the day-complete screen first. On Today it leaves the app.

The first Android version does not have Google sign-in and sync, the Dynamic Island, widgets or Siri. Everything else works offline on the phone, like a guest on the iPhone.

## Build and run (free, about 20 minutes the first time)

1. Install **Android Studio** (free) from developer.android.com/studio and open it once. It downloads the Android SDK by itself.
2. In Android Studio choose **File › Open** and pick the `android` folder of this project (`~/Desktop/mini_checklist/android`).
3. Wait for "Gradle sync" to finish (the bar at the bottom). The first time it downloads Gradle and the Android libraries.
4. **On your Android phone:** go to Settings › About phone and tap *Build number* 7 times to turn on Developer options. Then go to Settings › System › Developer options and turn on **USB debugging**. Connect the phone with a cable and allow the computer.
5. Pick the phone at the top of Android Studio and press the green **▶ Run**.

### An APK file for the tester

In Android Studio choose **Build › Build App Bundle(s) / APK(s) › Build APK(s)**, then click **locate** in the notice. The file is `android/app/build/outputs/apk/debug/app-debug.apk`. Send it to the tester. On their phone they open it and allow "Install unknown apps" for the app they opened it from (Files, Drive, WhatsApp…).

From Terminal you can also run:

```bash
cd ~/Desktop/mini_checklist/android && ./gradlew assembleDebug
```

### Notes

- The app id is `com.azarudeen.mimichecklist`. Version 4.4 (build 17) is set in `app/build.gradle.kts`.
- For Google Play you need your own signing key (Build › Generate Signed App Bundle) and a Play Console account.
- Screens and behaviour live in `web/`. A change there shows up in both the iPhone and Android apps on the next build.
