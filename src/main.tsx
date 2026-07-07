import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error listener to prevent broken images elegantly
window.addEventListener('error', function(e) {
  const target = e.target as HTMLElement;
  if (target && target.nodeName === 'IMG') {
    const img = target as HTMLImageElement;
    if (!img.dataset.retry) {
      img.dataset.retry = 'true';
      img.src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1000&auto=format&fit=crop&q=80';
    }
  }
}, true);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
