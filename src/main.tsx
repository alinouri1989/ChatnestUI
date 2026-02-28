import { Provider } from 'react-redux';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import store from './store/index.js';
import App from './App.jsx';
import "./assets/web-fonts/fontiran.css";
import "./shared/styles/tailwind.css";
import "./shared/styles/main.scss";

createRoot(document.getElementById('root')).render(
        <BrowserRouter>
                <Provider store={store}>
                        <App />
                </Provider>
        </BrowserRouter>
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
        window.addEventListener('load', () => {
                navigator.serviceWorker.register('/service-worker.js').catch((error) => {
                        console.error('Service worker registration failed:', error);
                });
        });
}
