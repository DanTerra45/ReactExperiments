import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app.jsx';
import DetailPreservation from './routes/detail_preservation.jsx';
import VideoEmbeds from './routes/video_embeds.jsx';
import WhatsAppShare from './routes/whatsapp_share.jsx';
import './styles.css';

const normalized_path = window.location.pathname.replace(/\/+$/, '') || '/';
const routes = {
  '/': App,
  '/detail-preservation': DetailPreservation,
  '/video-embeds': VideoEmbeds,
  '/whatsapp-share': WhatsAppShare,
};
const RootComponent = routes[normalized_path] ?? App;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootComponent />
  </StrictMode>,
);
