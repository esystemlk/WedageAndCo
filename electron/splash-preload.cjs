'use strict';

// Minimal, isolated preload for the splash window only.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('splash', {
  getVersion: () => ipcRenderer.invoke('app:version'),
  onReady: (cb) => ipcRenderer.on('splash:ready', () => cb()),
});
