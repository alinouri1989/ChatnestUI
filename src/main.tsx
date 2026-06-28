// @ts-nocheck
import { Provider } from 'react-redux';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import store from './store/index';
import App from './App';

import './shared/styles/main.scss';
import './shared/styles/tailwind.css';

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Provider store={store}>
      <App />
    </Provider>
  </BrowserRouter>
);

const SERVICE_WORKER_UPDATE_INTERVAL = 60 * 1000;

async function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register(
      '/service-worker.js',
      {
        scope: '/',

        // Always check the server for the latest service-worker.js file.
        updateViaCache: 'none',
      }
    );

    let isReloading = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (isReloading) return;

      isReloading = true;
      window.location.reload();
    });

    // Check for a newer worker when the application opens.
    await registration.update();

    // Keep checking while the application is open.
    setInterval(() => {
      registration.update().catch((error) => {
        console.error('Service worker update check failed:', error);
      });
    }, SERVICE_WORKER_UPDATE_INTERVAL);
  } catch (error) {
    console.error('Service worker registration failed:', error);
  }
}

window.addEventListener('load', registerServiceWorker);