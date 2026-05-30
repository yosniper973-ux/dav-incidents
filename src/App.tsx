import { useState, useEffect } from 'react';
import { initDatabase } from './services/database';
import { checkForUpdate, type RemoteVersion } from './services/updateService';
import Home from './pages/Home';
import AgentDetail from './pages/AgentDetail';
import pkg from '../package.json';

type Screen =
  | { type: 'home' }
  | { type: 'agent'; id: number };

function UpdateBanner({ info, onDismiss }: { info: RemoteVersion; onDismiss: () => void }) {
  function handleInstall() {
    if (!info.apkUrl) return;
    window.open(info.apkUrl, '_blank');
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 500,
      background: '#e3b341', color: '#0d1117',
      padding: '10px 16px',
      display: 'flex', alignItems: 'center', gap: 10,
      fontSize: 14, fontWeight: 600,
      boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
    }}>
      <span style={{ fontSize: 18 }}>🔄</span>
      <div style={{ flex: 1 }}>
        Mise à jour disponible — v{info.version}
        {info.notes && <div style={{ fontWeight: 400, fontSize: 12, opacity: 0.85 }}>{info.notes}</div>}
      </div>
      {info.apkUrl && (
        <button onClick={handleInstall} style={{
          background: '#0d1117', color: '#e3b341',
          border: 'none', borderRadius: 6, padding: '6px 12px',
          fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0,
        }}>
          Installer
        </button>
      )}
      <button onClick={onDismiss} style={{
        background: 'none', border: 'none', fontSize: 20,
        cursor: 'pointer', color: '#0d1117', lineHeight: 1, padding: 4, flexShrink: 0,
      }}>
        ×
      </button>
    </div>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [screen, setScreen] = useState<Screen>({ type: 'home' });
  const [update, setUpdate] = useState<RemoteVersion | null>(null);

  useEffect(() => {
    initDatabase()
      .then(() => setReady(true))
      .catch(e => setError(String(e)));
  }, []);

  useEffect(() => {
    checkForUpdate(pkg.version).then(info => {
      if (info) setUpdate(info);
    });
  }, []);

  if (error) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', padding: 24, flexDirection: 'column', gap: 16,
      }}>
        <div style={{ fontSize: 40 }}>⚠️</div>
        <div style={{ color: '#f85149', fontWeight: 700, fontSize: 18, textAlign: 'center' }}>
          Erreur d'initialisation
        </div>
        <div style={{ color: '#8b949e', fontSize: 14, textAlign: 'center', maxWidth: 320 }}>{error}</div>
        <button
          className="btn btn-primary"
          style={{ maxWidth: 240 }}
          onClick={() => { setError(''); initDatabase().then(() => setReady(true)).catch(e => setError(String(e))); }}
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (!ready) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
        <div className="spinner" style={{ margin: 0 }} />
        <div style={{ color: '#8b949e', fontSize: 15 }}>Initialisation de la base de données…</div>
      </div>
    );
  }

  return (
    <>
      {update && <UpdateBanner info={update} onDismiss={() => setUpdate(null)} />}
      <div style={update ? { paddingTop: 56 } : undefined}>
        {screen.type === 'agent' ? (
          <AgentDetail
            agentId={screen.id}
            onBack={() => setScreen({ type: 'home' })}
          />
        ) : (
          <Home onOpenAgent={(id) => setScreen({ type: 'agent', id })} />
        )}
      </div>
    </>
  );
}
