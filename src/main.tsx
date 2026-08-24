import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/bricolage-grotesque';
import './styles/tokens.css';
import './styles/base.css';
import './styles/home.css';
import './styles/location.css';
import './styles/pages.css';
import './styles/welcome.css';
import './styles/app.css';
import App from './App';
import { installUpdateRecovery } from './lib/appUpdate';

// BASE_URL is '/' — the app is served from the root of its own domain.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

// Before rendering: a tab left open across a deploy is serving the previous
// build out of the service worker's precache, and its lazy chunks no longer
// exist. See lib/appUpdate.ts — without this the app silently stays on the old
// release and dies on the first route that needs a chunk.
installUpdateRecovery();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
