import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app.jsx';
import DetailPreservation from './routes/detail_preservation.jsx';
import './styles.css';

const normalized_path = window.location.pathname.replace(/\/+$/, '') || '/';
const RootComponent = normalized_path === '/detail-preservation' ? DetailPreservation : App;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootComponent />
  </StrictMode>,
);
