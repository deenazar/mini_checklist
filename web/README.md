# Mimi Checklist — web app

The daily checklist with Mimi as a plain web app that runs in any modern browser
(Chrome, Safari, Firefox, Edge), on a computer or a phone.

It is the same app as the claude.ai artifact the iPhone app opens, split into normal files:

| File | What it is |
|---|---|
| `index.html` | The page markup |
| `styles.css` | All styles (light and dark themes) |
| `app.js` | The app: tasks, timers, reminders, water, notes, lists, vault, Mimi |
| `mimi-world.js`, `mimi-world.css` | The home header: time-of-day sky, Mimi the character with moods and moves, the week's bars |
| `local-runtime.js` | Stands in for claude.ai's services so the app runs anywhere (see below) |
| `device-fit.js` | Fits the page to the phone: full screen behind the status bar, Mimi's pill over the Dynamic Island |
| `backup-ui.js` | Settings › Backup: export a backup file, restore one |
| `account-ui.js` | Settings › Account & sync (iPhone app): Google sign-in and encrypted sync status |
| `extras-ui.js` | Profile › Account (sign in / sign out), the natural-voice tip, Settings › Upcoming release |
| `landing.js`, `landing.css` | The animated welcome page (first run; open it again with `index.html?welcome`) |
| `vendor/` | The fonts, bundled so the app works offline (licences included) |
| `icon.png` | App icon (same as the iPhone app) |

The iPhone app (`ios/`) bundles a copy of this folder. After changing anything here, run
`scripts/sync-ios-web.sh`.

## Run it

From the repository root:

```bash
python3 -m http.server 8000 --directory web
```

Then open <http://localhost:8000> in your browser. On your phone (same Wi-Fi), open
`http://<your-computer's-IP>:8000`.

Any static file server works too (for example `npx serve web`). Opening `index.html` straight
from disk also works in most browsers, but a server is more reliable.

## How it works without claude.ai

On claude.ai the app saves to Claude's artifact storage. Here, `local-runtime.js` provides the same
`claude.use(...)` services locally:

- **Database:** tasks, daily tasks, lists, water, notes, profile and the vault are saved in this
  browser's `localStorage` (in the iPhone app: in a file inside the app). Changes show up live in other tabs
  of the same browser.
- **Your account:** a private local id is created for this browser.
- **Mimi's voice, listening and chat:** the app uses the browser's own speech synthesis and speech
  recognition (Chrome, Edge and Safari support listening) and Mimi's built-in replies.

Things to know:

- Data stays **in this browser only**. It does not sync between devices, and clearing site data deletes it.
- **Back up and restore** in Settings › Backup. The same file works in the browser and the iPhone app, and
  restoring the backup made from the old claude.ai checklist brings all of that data in.
- Browser storage holds about 5 MB, so keep profile photos small.

## Where the code came from

`app.js`, `styles.css` and the markup in `index.html` came from the claude.ai artifact
with a few fixes since: the island's day labels no longer cover the date on phones, speech errors such as an
unsupported language now show a message, and wording that referred to claude.ai was updated.
Keep `local-runtime.js` loading before `app.js`, and `backup-ui.js` after it, in `index.html`.
