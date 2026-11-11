# mini_checklist

Mimi Checklist — a daily checklist with Mimi, the voice assistant.

## Web app

The checklist itself lives in [`web/`](web/) and runs in any browser:

```bash
python3 -m http.server 8000 --directory web
```

Then open <http://localhost:8000>. Data is saved in your browser. See [`web/README.md`](web/README.md).

## iPhone app

The iPhone app lives in [`ios/`](ios/). It's a SwiftUI app that bundles the web app, so it works offline, and adds native extras: the running task timer in the
Dynamic Island and on the Lock Screen (Live Activity), optional Google sign-in with sync encrypted by your own
password, data saved in the app, iPhone speech recognition for the mic and “Hey Mimi”, reminders as real
notifications, haptics, and backups through the share sheet.

It's an Xcode project generated with XcodeGen. See [`ios/README.md`](ios/README.md) for setup (Mac with Xcode +
iPhone), Google sign-in setup, and moving your old claude.ai data in. After changing `web/`, run `scripts/sync-ios-web.sh` to update the app's copy.
