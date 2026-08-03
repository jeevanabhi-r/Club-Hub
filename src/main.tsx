import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error listener to handle broken image links gracefully
window.addEventListener('error', function(e) {
  const target = e.target as HTMLElement;
  if (target && target.nodeName === 'IMG') {
    const img = target as HTMLImageElement;
    img.style.display = 'none';
  }
}, true);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
