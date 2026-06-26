import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import './index.css';

if ('serviceWorker' in navigator) {
  // Reload the page the moment a new SW takes over (skipWaiting fired).
  // This is what actually swaps the old cached JS bundles for new ones.
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!reloading) { reloading = true; window.location.reload(); }
  });

  // After the page settles, immediately check for a new SW, then keep
  // polling every 60 s.  This means a new deploy lands within ~60 s for
  // every user — no manual cache-clear needed.
  window.addEventListener('load', () => {
    navigator.serviceWorker.ready.then((reg) => {
      reg.update();
      setInterval(() => reg.update(), 60_000);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
