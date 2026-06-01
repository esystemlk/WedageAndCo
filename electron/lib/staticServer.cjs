'use strict';

/**
 * Local static server for the production build.
 *
 * The existing web app uses BrowserRouter (history API). On a real host this
 * works because Vercel rewrites every path to /index.html (see ../vercel.json).
 * We reproduce that exact behaviour here with an SPA fallback so the app's
 * routes and navigation behave identically inside Electron — without changing
 * a single line of the web app or its router.
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');

/**
 * Start an HTTP server that serves the built web app from `webDir`.
 * @param {string} webDir Absolute path to the built web app (contains index.html).
 * @returns {Promise<{ url: string, close: () => void }>}
 */
function startStaticServer(webDir) {
  return new Promise((resolve, reject) => {
    const indexFile = path.join(webDir, 'index.html');
    if (!fs.existsSync(indexFile)) {
      return reject(new Error(`Web build not found at ${indexFile}. Run "npm run build:web" first.`));
    }

    const app = express();

    // Serve hashed static assets exactly as the host would.
    app.use(express.static(webDir, { index: false, maxAge: '1h' }));

    // SPA fallback — mirrors the Vercel rewrite rule, so deep links work.
    app.get('*', (_req, res) => {
      res.sendFile(indexFile);
    });

    // Bind to loopback on an OS-assigned free port.
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () => server.close(),
      });
    });
    server.on('error', reject);
  });
}

module.exports = { startStaticServer };
