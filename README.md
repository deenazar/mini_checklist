# mini_checklist

Mimi Checklist — a daily checklist with Mimi, the voice assistant.

## Web app

The checklist itself lives in [`web/`](web/) and runs in any browser:

```bash
python3 -m http.server 8000 --directory web
```

Then open <http://localhost:8000>. Data is saved in your browser. See [`web/README.md`](web/README.md).

## iPhone app

The iPhone app lives in [`ios/`](ios/). It's a SwiftUI app (an Xcode / Swift Playgrounds `.swiftpm` package)
that bundles the web app, so it works offline with no sign-in, and adds native extras: data saved in the app,
iPhone speech recognition for the mic and “Hey Mimi”, reminders as real notifications, haptics, a clipboard
that clears copied vault passwords after 60 seconds, and backups through the share sheet.

See [`ios/README.md`](ios/README.md) for install steps (Mac with Xcode + iPhone, about 5 minutes) and for moving
your old claude.ai data in. After changing `web/`, run `scripts/sync-ios-web.sh` to update the app's copy.
