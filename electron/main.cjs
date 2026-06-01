'use strict';

/**
 * Electron main process — a thin desktop wrapper around the existing web app.
 *
 * Design goals (do NOT change the web app):
 *  - In development it loads the running Vite dev server (ELECTRON_START_URL).
 *  - In production it serves the existing ../dist build through a local static
 *    server with an SPA fallback that mirrors vercel.json, so BrowserRouter and
 *    every route/navigation flow behave exactly as on the website.
 *  - Firebase, auth, API integrations and the database are reached over the
 *    network exactly like the browser — nothing about them is touched here.
 */

const { app, BrowserWindow, Tray, Menu, ipcMain, dialog, Notification, shell, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { startStaticServer } = require('./lib/staticServer.cjs');
const { initAutoUpdater, quitAndInstall } = require('./lib/updater.cjs');

const isDev = !app.isPackaged;
const START_URL = process.env.ELECTRON_START_URL; // set in dev

// The live production website. Loading this is the most faithful "wrapper":
// the desktop app always reflects what's deployed and shares the same Firebase
// backend over the network — no rebuild needed. Override or disable via env:
//   DESKTOP_URL=...            → load a different URL
//   DESKTOP_LOAD_LOCAL=true    → ignore the hosted URL and serve ../dist locally
const PRODUCTION_URL = process.env.DESKTOP_URL || 'https://wedageandco.vercel.app';
const LOAD_LOCAL = process.env.DESKTOP_LOAD_LOCAL === 'true';

let mainWindow = null;
let splashWindow = null;
let tray = null;
let staticServer = null;
let isQuitting = false;

// Minimum time the splash stays visible so the animation doesn't just flash.
const SPLASH_MIN_MS = 6000;

// Resolve the built web app: packaged → resources/web, otherwise → ../dist.
function resolveWebDir() {
  const packaged = path.join(process.resourcesPath || '', 'web');
  if (fs.existsSync(path.join(packaged, 'index.html'))) return packaged;
  return path.join(__dirname, '..', 'dist');
}

function resolveIcon() {
  const candidates = [
    path.join(__dirname, 'build', 'icon.png'),
    path.join(__dirname, '..', 'public', 'logo.png.JPEG'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      const img = nativeImage.createFromPath(c);
      if (!img.isEmpty()) return img;
    }
  }
  return undefined;
}

async function startLocalServer() {
  const webDir = resolveWebDir();
  staticServer = await startStaticServer(webDir);
  return staticServer.url;
}

async function resolveAppUrl() {
  // 1) Dev: the running Vite dev server.
  if (START_URL) return START_URL;

  // 2) Explicit opt-in to the bundled local build (offline-first).
  if (LOAD_LOCAL) return startLocalServer();

  // 3) Default: the live hosted website. Fall back to the local build only if
  //    the local build exists (so a packaged app can still open while offline).
  return PRODUCTION_URL;
}

// If the hosted site fails to load (e.g. no internet), transparently fall back
// to the bundled ../dist build when one is available.
async function loadWithFallback(url) {
  try {
    await mainWindow.loadURL(url);
  } catch (err) {
    const isRemote = /^https?:\/\//i.test(url) && !/127\.0\.0\.1|localhost/.test(url);
    const haveLocal = fs.existsSync(path.join(resolveWebDir(), 'index.html'));
    if (isRemote && haveLocal && !staticServer) {
      const localUrl = await startLocalServer();
      await mainWindow.loadURL(localUrl);
    } else {
      throw err;
    }
  }
}

// Frameless animated splash shown while the web app loads. Pure local HTML —
// it never touches the web app and is desktop-only.
function createSplash() {
  splashWindow = new BrowserWindow({
    width: 820,
    height: 560,
    frame: false,
    resizable: false,
    movable: true,
    center: true,
    show: false,
    transparent: false,
    backgroundColor: '#0b0f1f',
    alwaysOnTop: true,
    skipTaskbar: true,
    icon: resolveIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'splash-preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.once('ready-to-show', () => splashWindow && splashWindow.show());
  splashWindow.on('closed', () => { splashWindow = null; });
}

async function createWindow() {
  const icon = resolveIcon();
  const splashStart = Date.now();

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    backgroundColor: '#0f172a',
    icon,
    // Standard native OS title bar with real minimize / maximize / close
    // buttons. It sits ABOVE the web content (not overlaid), so it never
    // collides with the web app's own top-right header icons, and the web
    // app's DOM stays completely untouched. Window controls are also exposed
    // to the renderer via IPC (window.desktop.window.*) for optional use.
    frame: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const url = await resolveAppUrl();
  await loadWithFallback(url);

  // Hand off from splash → main once the real app is ready, honouring a
  // minimum splash duration so the loading animation is seen.
  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.webContents.send('splash:ready');
    }
    const elapsed = Date.now() - splashStart;
    const wait = Math.max(0, SPLASH_MIN_MS - elapsed);
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
      }
    }, wait);
  });

  // Keep the renderer informed about maximize state (for a custom title bar UI).
  const emitMax = () => mainWindow?.webContents.send('win:maximize-change', mainWindow.isMaximized());
  mainWindow.on('maximize', emitMax);
  mainWindow.on('unmaximize', emitMax);

  // External links open in the user's browser, not inside the app shell.
  mainWindow.webContents.setWindowOpenHandler(({ url: target }) => {
    if (/^https?:\/\//i.test(target)) {
      shell.openExternal(target);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Minimize-to-tray instead of quitting when the window is closed.
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });

  initAutoUpdater(mainWindow);
}

function createTray() {
  const icon = resolveIcon();
  if (!icon) return; // tray needs an image; skip gracefully if none found
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip('Wedage & Co. Desktop');
  const menu = Menu.buildFromTemplate([
    { label: 'Open Wedage & Co.', click: () => { mainWindow ? (mainWindow.show(), mainWindow.focus()) : createWindow(); } },
    { type: 'separator' },
    { label: 'Quit', click: () => { isQuitting = true; app.quit(); } },
  ]);
  tray.setContextMenu(menu);
  tray.on('click', () => {
    if (!mainWindow) return createWindow();
    mainWindow.isVisible() ? mainWindow.focus() : mainWindow.show();
  });
}

// ── IPC: window controls ─────────────────────────────────────────────────────
ipcMain.handle('win:minimize', () => mainWindow?.minimize());
ipcMain.handle('win:maximize', () => mainWindow?.maximize());
ipcMain.handle('win:unmaximize', () => mainWindow?.unmaximize());
ipcMain.handle('win:toggle-maximize', () => {
  if (!mainWindow) return;
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});
ipcMain.handle('win:close', () => mainWindow?.close());
ipcMain.handle('win:is-maximized', () => !!mainWindow?.isMaximized());

// ── IPC: native file access ──────────────────────────────────────────────────
ipcMain.handle('files:open', async (_e, options = {}) => {
  const res = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: options.filters,
    ...options,
  });
  return res.canceled ? null : res.filePaths;
});

ipcMain.handle('files:save', async (_e, options = {}) => {
  const res = await dialog.showSaveDialog(mainWindow, {
    defaultPath: options.defaultPath,
    filters: options.filters,
  });
  if (res.canceled || !res.filePath) return null;
  if (options.data !== undefined) {
    fs.writeFileSync(res.filePath, options.data);
  }
  return res.filePath;
});

ipcMain.handle('files:read', async (_e, filePath) => {
  return fs.promises.readFile(filePath, 'utf-8');
});

ipcMain.handle('files:write', async (_e, { filePath, data }) => {
  await fs.promises.writeFile(filePath, data);
  return true;
});

ipcMain.handle('files:show-in-folder', (_e, filePath) => {
  shell.showItemInFolder(filePath);
});

// ── IPC: notifications ───────────────────────────────────────────────────────
ipcMain.handle('notify', (_e, { title, body, options = {} }) => {
  if (!Notification.isSupported()) return false;
  const n = new Notification({ title, body, ...options });
  n.on('click', () => { mainWindow?.show(); mainWindow?.focus(); });
  n.show();
  return true;
});

// ── IPC: app / updates ───────────────────────────────────────────────────────
ipcMain.handle('app:version', () => app.getVersion());
ipcMain.handle('app:install-update', () => quitAndInstall());

// ── Lifecycle ────────────────────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
  });

  app.whenReady().then(() => {
    createSplash();
    createWindow();
    createTray();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
      else mainWindow?.show();
    });
  });
}

app.on('before-quit', () => { isQuitting = true; });

app.on('window-all-closed', () => {
  // Stay alive in the tray; only quit explicitly (tray → Quit).
  if (process.platform !== 'darwin' && isQuitting) {
    if (staticServer) staticServer.close();
    app.quit();
  }
});

app.on('quit', () => { if (staticServer) staticServer.close(); });
