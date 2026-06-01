/**
 * registerPWA — registers the service worker for installability + offline.
 * Skipped on localhost dev so it never interferes with Vite HMR.
 */
export function registerPWA() {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  const host = window.location.hostname;
  const isDev = host === 'localhost' || host === '127.0.0.1';
  if (isDev) return; // don't register the SW during local development

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}
