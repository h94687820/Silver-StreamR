import { createRoot } from 'react-dom/client';
import { setBaseUrl } from '@workspace/api-client-react';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';

// When deployed on Cloudflare Pages, the Worker is on a separate domain.
// In local dev the API server runs on the same origin so relative paths work.
const apiUrl = import.meta.env.VITE_API_URL
  ?? (import.meta.env.PROD ? "https://silver-stream-api.mcfoxy.workers.dev" : "");
if (apiUrl) {
  setBaseUrl(apiUrl.replace(/\/$/, ''));
}

// Register PWA service worker for offline support and installability
if (import.meta.env.PROD) {
  registerSW({
    onNeedRefresh() {
      // New content available – update silently
    },
    onOfflineReady() {
      console.log('App ready for offline use');
    },
  });
}

createRoot(document.getElementById('root')!).render(<App />);
