# Gravity Rift

Gravity Rift is a fast, gravity-flip arcade game built as an offline-first PWA. It is designed to feel sharp on mobile, with smooth physics, bold visuals, and a forgiving stability system.

## Screenshots

![Gravity Rift gameplay](screenshot-1.svg)

## How to Play

- Tap to flip gravity and thread the gates.
- Perfect passes grow your combo and can restore stability after streaks.
- You have 25 stability hits before the rift collapses.

## Quick Start

1. Run a local server (required for PWA install):
   ```bash
   python -m http.server 8989
   ```
2. Open `http://localhost:8989` in your browser.
3. Install from the in-game Download button or your browser’s install prompt.

## Deploy (Netlify or GitHub Pages)

- Make sure `index.html`, `gravity-rift.js`, `manifest.json`, `sw.js`, and icons are in the root.
- Host the folder as a static site. No build step needed.

## File Overview

```
├── index.html
├── gravity-rift.js
├── manifest.json
├── sw.js
├── icon-192.svg
├── icon-192-maskable.svg
├── icon-512.svg
├── icon-512-maskable.svg
└── screenshot-1.svg
```
