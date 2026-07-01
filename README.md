# Hangboard Trainer

A mobile-first PWA for **hangboarding** — finger-strength training for climbers.
Works offline, installs to your phone's home screen, and stores all data locally
on your device.

## Features

- **Programs** — built-in protocols (5:5, 7:3, 10:5 repeaters, max hangs,
  frequency hangs) plus your own custom programs with selectable edge size, edge
  type, finger count and hand position (full/half crimp, drag, open hand, sloper,
  pinch).
- **Workout timer** — full-screen colour cues and countdown, with audio and
  visuals locked to the same clock so they stay perfectly in sync.
- **Sound themes** — beeps, piano, or duck (user-selectable, with preview).
- **Session history** — logged sessions with an RPE rating, notes, and charts.
- **Appearance** — light / dark mode (defaults to dark) plus editable cue colours.
- **Local-first** — data lives in your browser (IndexedDB + localStorage).
  Optional Google-account sync is planned.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build to dist/
npm run icons      # regenerate app icons from scripts/generate-icons.mjs
```

Tech: Vite + React + TypeScript, PWA (vite-plugin-pwa), Zustand, Dexie
(IndexedDB), Recharts, Web Audio API.

## Host it on GitHub Pages

This repo ships a workflow at `.github/workflows/deploy.yml` that builds and
deploys on every push to `main`.

1. Push this project to a GitHub repository (see below).
2. In the repo, go to **Settings → Pages** and set **Source** to
   **GitHub Actions**.
3. Push to `main` (or run the workflow manually). The app publishes to
   `https://<your-username>.github.io/<repo-name>/`.

The workflow automatically sets the correct base path from the repo name, and the
app uses hash-based routing so deep links work without any server config.

### First push

```bash
git init
git add -A
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```
