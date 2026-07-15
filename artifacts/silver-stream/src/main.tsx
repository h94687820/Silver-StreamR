import { createRoot } from 'react-dom/client';
import { setBaseUrl } from '@workspace/api-client-react';
import App from './App';
import './index.css';

// When deployed on Cloudflare Pages, VITE_API_URL points to the Worker.
// In local dev (and same-origin deploys) this is left empty → relative /api/... paths work.
const apiUrl = import.meta.env.VITE_API_URL;
if (apiUrl) {
  setBaseUrl(apiUrl.replace(/\/$/, ''));
}

createRoot(document.getElementById('root')!).render(<App />);
