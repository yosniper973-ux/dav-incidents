import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { defineCustomElements as jeepSqliteLoader } from 'jeep-sqlite/loader';
import './index.css';
import App from './App';

// Enregistre le web component jeep-sqlite (nécessaire pour le mode navigateur)
jeepSqliteLoader(window);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
