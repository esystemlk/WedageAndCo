'use strict';

/**
 * Auto-update wiring (electron-updater). Completely optional and isolated:
 * if no publish server is configured, this silently no-ops so the desktop
 * app still runs. Configure the `publish` URL in package.json > build.publish.
 */

let autoUpdater;
try {
  ({ autoUpdater } = require('electron-updater'));
} catch (_e) {
  autoUpdater = null;
}

function initAutoUpdater(win) {
  if (!autoUpdater) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  const send = (channel, payload) => {
    if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
  };

  autoUpdater.on('checking-for-update', () => send('desktop:update', { status: 'checking' }));
  autoUpdater.on('update-available', (info) => send('desktop:update', { status: 'available', info }));
  autoUpdater.on('update-not-available', () => send('desktop:update', { status: 'none' }));
  autoUpdater.on('download-progress', (p) => send('desktop:update', { status: 'downloading', progress: p }));
  autoUpdater.on('update-downloaded', (info) => send('desktop:update', { status: 'downloaded', info }));
  autoUpdater.on('error', (err) => send('desktop:update', { status: 'error', message: String(err) }));

  // Never block startup if the update feed is unreachable.
  autoUpdater.checkForUpdatesAndNotify().catch(() => {});
}

function quitAndInstall() {
  if (autoUpdater) autoUpdater.quitAndInstall();
}

module.exports = { initAutoUpdater, quitAndInstall };
