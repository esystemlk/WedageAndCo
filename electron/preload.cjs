'use strict';

/**
 * Preload — runs in an isolated context with contextIsolation enabled.
 *
 * It exposes a single, additive `window.desktop` namespace. The existing web
 * app never references this object, so behaviour in the browser is unchanged
 * (window.desktop is simply undefined there). Desktop-only UI can feature-detect
 * with `if (window.desktop) { ... }`.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  /** Always true inside Electron — lets the web app feature-detect the host. */
  isElectron: true,
  platform: process.platform,

  // ── Window controls (custom title bar) ───────────────────────────────────
  window: {
    minimize: () => ipcRenderer.invoke('win:minimize'),
    maximize: () => ipcRenderer.invoke('win:maximize'),
    unmaximize: () => ipcRenderer.invoke('win:unmaximize'),
    toggleMaximize: () => ipcRenderer.invoke('win:toggle-maximize'),
    close: () => ipcRenderer.invoke('win:close'),
    isMaximized: () => ipcRenderer.invoke('win:is-maximized'),
    onMaximizeChange: (cb) => {
      const handler = (_e, maximized) => cb(maximized);
      ipcRenderer.on('win:maximize-change', handler);
      return () => ipcRenderer.removeListener('win:maximize-change', handler);
    },
  },

  // ── Native file access ────────────────────────────────────────────────────
  files: {
    openFile: (options) => ipcRenderer.invoke('files:open', options),
    saveFile: (options) => ipcRenderer.invoke('files:save', options),
    readFile: (filePath) => ipcRenderer.invoke('files:read', filePath),
    writeFile: (filePath, data) => ipcRenderer.invoke('files:write', { filePath, data }),
    showInFolder: (filePath) => ipcRenderer.invoke('files:show-in-folder', filePath),
  },

  // ── Desktop notifications ────────────────────────────────────────────────
  // (The standard Web Notification API also works in the renderer; this is a
  //  native passthrough for use without requesting browser permission.)
  notify: (title, body, options) => ipcRenderer.invoke('notify', { title, body, options }),

  // ── App / updates ────────────────────────────────────────────────────────
  app: {
    getVersion: () => ipcRenderer.invoke('app:version'),
    onUpdate: (cb) => {
      const handler = (_e, payload) => cb(payload);
      ipcRenderer.on('desktop:update', handler);
      return () => ipcRenderer.removeListener('desktop:update', handler);
    },
    installUpdate: () => ipcRenderer.invoke('app:install-update'),
  },
});
