# Wedage & Co. — Desktop (Electron wrapper)

A **separate, isolated** Electron desktop app that wraps the existing
Wedage & Co. web application. It does **not** modify the web app in any way —
no components, routes, Firebase config, auth flows, database structures, API
integrations, or hosting/deployment settings are changed.

The desktop app simply loads the same React build and talks to the **same
Firebase backend over the network**, exactly like the browser. The website and
the desktop app coexist and stay 100% backward compatible.

## How it loads the web app

| Environment | What it loads |
|-------------|---------------|
| Development | The running Vite dev server at `ELECTRON_START_URL` (default `http://localhost:3000`) |
| Production (default) | The **live hosted website** `https://wedageandco.vercel.app` — always reflects what's deployed, shares the same Firebase backend |
| Production (offline mode) | Set `DESKTOP_LOAD_LOCAL=true` to serve the bundled `../dist` build via a local static server with an SPA fallback that mirrors `vercel.json` |

By default the desktop app is a true wrapper around the deployed site, so it
stays in lockstep with production with no rebuild. If the hosted URL can't be
reached and a bundled `../dist` build exists, it **transparently falls back** to
serving that build locally.

Configuration via environment variables:

| Variable | Effect |
|----------|--------|
| `DESKTOP_URL` | Load a different URL instead of the default hosted site |
| `DESKTOP_LOAD_LOCAL=true` | Ignore the hosted URL and serve `../dist` locally |
| `ELECTRON_START_URL` | Dev override (Vite dev server) |

Because the local build is served over `http://127.0.0.1:<port>` (not
`file://`), history-based routing and navigation behave exactly as on Vercel.

## Run in development

```bash
# Terminal 1 — start the existing web app (unchanged)
cd ..
npm run dev          # http://localhost:3000

# Terminal 2 — start Electron pointing at it
cd electron
npm install
npm run dev
```

## Build a distributable

```bash
cd electron
npm install
npm run dist        # runs ../npm run build first, then electron-builder
```

Output goes to `electron/release/`. The web build is bundled as a read-only
resource (`resources/web`) — your `dist/` and source are never altered.

## Desktop-only features

All exposed additively on `window.desktop` via a context-isolated preload.
The web app never references it, so in the browser `window.desktop` is simply
`undefined`. Feature-detect with `if (window.desktop) { ... }`.

- **Custom title bar + min / max / close** — native window-control overlay
  (`titleBarOverlay`); also controllable via `window.desktop.window.*`.
- **System tray** — minimize-to-tray, restore, quit.
- **Desktop notifications** — `window.desktop.notify(title, body)` (the standard
  Web `Notification` API also works).
- **Auto updater** — `electron-updater`; configure `build.publish.url` in
  `package.json`. No-ops safely until a feed is configured.
- **Native file access** — `window.desktop.files.{openFile,saveFile,readFile,
  writeFile,showInFolder}` via IPC.

### Example (desktop-only, optional)

```ts
if (window.desktop) {
  await window.desktop.notify('Sync complete', 'All records are up to date.');
  const paths = await window.desktop.files.openFile({ filters: [{ name: 'CSV', extensions: ['csv'] }] });
}
```

## Isolation guarantees

- Everything desktop-related lives in this `electron/` folder with its **own**
  `package.json` and dependencies.
- No file outside `electron/` is modified.
- The preload only **adds** `window.desktop`; it removes/overrides nothing.
- Renderer runs with `contextIsolation: true`, `nodeIntegration: false`,
  `sandbox: true`.
