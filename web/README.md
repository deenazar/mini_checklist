# Mimi Checklist — web app

The daily checklist with Mimi as a plain web app that runs in any modern browser
(Chrome, Safari, Firefox, Edge), on a computer or a phone.

It is the same app as the claude.ai artifact the iPhone app opens, split into normal files:

| File | What it is |
|---|---|
| `index.html` | The page markup |
| `styles.css` | All styles (light and dark themes) |
| `app.js` | The app: tasks, timers, reminders, water, notes, lists, vault, Mimi and her 3D island |
| `local-runtime.js` | Stands in for claude.ai's services so the app runs anywhere (see below) |
| `icon.png` | App icon (same as the iPhone app) |

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
  browser's `localStorage`. Changes show up live in other tabs of the same browser.
- **Your account:** a private local id is created for this browser.
- **Mimi's voice, listening and chat:** the app uses the browser's own speech synthesis and speech
  recognition (Chrome, Edge and Safari support listening) and Mimi's built-in replies.

Things to know:

- Data stays **in this browser only**. It does not sync between devices, and clearing site data deletes it.
- **Back up** from the browser console (F12 → Console):
  `copy(mimiLocal.exportData())` copies a backup to the clipboard.
  Restore it with `mimiLocal.importData('<paste the backup here>')`, then reload.
- Browser storage holds about 5 MB, so keep profile photos small.
- A few labels still mention Claude (for example “Signed in with your Claude account” in Profile, and
  “sync everywhere” in Settings). They come from the claude.ai version of the page.

## Updating from the artifact

`app.js`, `styles.css` and the markup in `index.html` are copied unchanged from the claude.ai artifact
(the iPhone app's page). To bring in a newer artifact version, copy its `<script>`, `<style>` and body markup
into these files again. Keep `local-runtime.js` loading before `app.js` in `index.html`.
