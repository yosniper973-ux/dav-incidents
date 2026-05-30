import { useState, useEffect, useRef, useCallback } from 'react';
import { searchAgents, getAgentsBlockes, joursSince } from '../services/database';
import { exportRapportJour } from '../services/exportService';
import type { AgentWithSolde } from '../types';
import CreateAgentModal from '../components/CreateAgentModal';

interface Props {
  onOpenAgent: (id: number) => void;
}

function pad(n: number) { return String(n).padStart(2, '0'); }

function todayLabel(): string {
  const d = new Date();
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function AgentCard({ agent, onClick }: { agent: AgentWithSolde; onClick: () => void }) {
  const isBlocked = agent.dernier_solde !== null && agent.dernier_solde < 0;
  const jours = agent.date_dernier_solde ? joursSince(agent.date_dernier_solde) : null;

  return (
    <div
      className={`card card-clickable ${isBlocked ? 'card-blocked' : ''}`}
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>
          {agent.nom} {agent.prenom}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
          {[agent.matricule, agent.service].filter(Boolean).join(' · ') || 'Aucune info complémentaire'}
        </div>
        {isBlocked && jours !== null && (
          <div style={{ fontSize: 13, marginTop: 4, color: jours >= 7 ? 'var(--danger)' : 'var(--warning)', fontWeight: 600 }}>
            Bloqué depuis {jours === 0 ? "aujourd'hui" : `${jours} jour${jours > 1 ? 's' : ''}`}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
        {isBlocked && (
          <div className="tag-blocked">⛔ Bloqué</div>
        )}
        {agent.dernier_solde !== null && (
          <div style={{
            fontWeight: 800,
            fontSize: 18,
            color: isBlocked ? 'var(--danger)' : 'var(--success)',
          }}>
            {agent.dernier_solde > 0 ? '+' : ''}{agent.dernier_solde}
          </div>
        )}
        <div style={{ fontSize: 18, color: 'var(--text-muted)' }}>›</div>
      </div>
    </div>
  );
}

export default function Home({ onOpenAgent }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AgentWithSolde[]>([]);
  const [blockes, setBloques] = useState<AgentWithSolde[]>([]);
  const [searching, setSearching] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadBlockes = useCallback(async () => {
    const list = await getAgentsBlockes();
    setBloques(list);
  }, []);

  useEffect(() => { loadBlockes(); }, [loadBlockes]);

  function handleQueryChange(val: string) {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const res = await searchAgents(val);
      setResults(res);
      setSearching(false);
    }, 300);
  }

  function clearSearch() {
    setQuery('');
    setResults([]);
  }

  async function handleExport() {
    setExporting(true);
    setExportError('');
    try {
      await exportRapportJour();
    } catch (e) {
      setExportError(String(e));
    }
    setExporting(false);
  }

  const showResults = query.trim().length > 0;

  return (
    <div className="app">
      <div className="header">
        <div>
          <div className="header-title">DAV Incidents</div>
          <div className="header-sub">CHU de Cayenne · {todayLabel()}</div>
        </div>
      </div>

      <div className="content">
        {/* Barre de recherche */}
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            className="input search-input"
            placeholder="Matricule, nom ou prénom…"
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            autoComplete="off"
            autoCorrect="off"
          />
          {query && (
            <button className="search-clear" onClick={clearSearch}>×</button>
          )}
        </div>

        {/* Résultats de recherche */}
        {showResults && (
          <>
            {searching ? (
              <div className="spinner" style={{ width: 24, height: 24, margin: '16px auto' }} />
            ) : (
              <>
                {results.length > 0 ? (
                  <>
                    <div className="section-title">Résultats ({results.length})</div>
                    {results.map(a => (
                      <AgentCard key={a.id} agent={a} onClick={() => onOpenAgent(a.id)} />
                    ))}
                  </>
                ) : (
                  <div className="empty-state">Aucun agent trouvé pour « {query} »</div>
                )}

                <div
                  style={{
                    marginTop: 16,
                    padding: 16,
                    background: 'var(--card)',
                    borderRadius: 'var(--radius)',
                    border: '1px dashed var(--border)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 10 }}>
                    Agent introuvable ?
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ width: 'auto', margin: '0 auto' }}
                    onClick={() => setShowCreate(true)}
                  >
                    + Créer la fiche agent
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* Liste de rappel (accueil, hors recherche) */}
        {!showResults && (
          <>
            <div className="section-title">
              À revérifier sur Polytex
              {blockes.length > 0 && (
                <span style={{
                  marginLeft: 8,
                  background: 'var(--danger)',
                  color: '#fff',
                  borderRadius: 10,
                  padding: '1px 8px',
                  fontSize: 11,
                  fontWeight: 700,
                  verticalAlign: 'middle',
                }}>
                  {blockes.length}
                </span>
              )}
            </div>

            {blockes.length === 0 ? (
              <div className="empty-state">
                <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
                Aucun agent bloqué actuellement.
              </div>
            ) : (
              blockes.map(a => (
                <AgentCard key={a.id} agent={a} onClick={() => onOpenAgent(a.id)} />
              ))
            )}

            {/* Export */}
            <div className="section-title" style={{ marginTop: 32 }}>Rapport</div>
            {exportError && (
              <div className="error-box">{exportError}</div>
            )}
            <button
              className="btn btn-secondary"
              onClick={handleExport}
              disabled={exporting}
              style={{ gap: 10 }}
            >
              <span style={{ fontSize: 20 }}>📊</span>
              {exporting ? 'Génération…' : `Envoyer le rapport du jour (Excel)`}
            </button>
          </>
        )}
      </div>

      {/* FAB Nouvel agent */}
      <button className="fab" onClick={() => setShowCreate(true)} title="Nouvel agent">
        +
      </button>

      {/* Modal création */}
      {showCreate && (
        <CreateAgentModal
          onClose={() => setShowCreate(false)}
          onCreated={(id) => {
            setShowCreate(false);
            clearSearch();
            loadBlockes();
            onOpenAgent(id);
          }}
          prefill={query}
        />
      )}
    </div>
  );
}
