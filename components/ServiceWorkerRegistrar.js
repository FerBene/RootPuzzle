'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    // Un service worker activo en localhost puede servir bundles anteriores y
    // ocultar correcciones recién compiladas. En desarrollo se elimina junto
    // con sus cachés; el registro offline se conserva únicamente en producción.
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .catch(() => {});
      if ('caches' in window) {
        caches.keys()
          .then((keys) => Promise.all(keys.filter((key) => key.startsWith('raices-')).map((key) => caches.delete(key))))
          .catch(() => {});
      }
      return;
    }

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        // eslint-disable-next-line no-console
        console.log('Service worker registered:', reg.scope);

        reg.addEventListener('updatefound', () => {
          // eslint-disable-next-line no-console
          console.log('New service worker found.');
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('Service worker registration failed:', err);
      }
    };

    // Register after load to avoid delaying first paint on slow networks
    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register);
      return () => window.removeEventListener('load', register);
    }
  }, []);

  return null;
}
