# mini_checklist

Mimi Checklist — a daily checklist with Mimi, the voice assistant.

## Web app

The checklist itself lives in [`web/`](web/) and runs in any browser:

```bash
python3 -m http.server 8000 --directory web
```

Then open <http://localhost:8000>. Data is saved in your browser. See [`web/README.md`](web/README.md).

## iPhone app

The iPhone app lives in [`ios/`](ios/). It is a SwiftUI app (an Xcode / Swift Playgrounds
`.swiftpm` package) that opens the checklist page full screen and adds native extras:
iPhone speech recognition for the mic button and “Hey Mimi”, task reminders as real iOS
notifications, haptics, and a clipboard that clears copied vault passwords after 60 seconds.

See [`ios/README.md`](ios/README.md) for install steps (Mac with Xcode + iPhone, about 5 minutes).
