import { useState, useEffect, useCallback } from 'react';
import {
  getAgent,
  getSoldesAgent,
  getPretsAgent,
  joursSince,
} from '../services/database';
import type { AgentWithSolde, SoldePolytex, Pret } from '../types';
import SoldeModal from '../components/SoldeModal';
import LoanModal from '../components/LoanModal';

interface Props {
  agentId: number;
  onBack: () => void;
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} à ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtDateShort(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} à ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AgentDetail({ agentId, onBack }: Props) {
  const [agent, setAgent] = useState<AgentWithSolde | null>(null);
  const [soldes, setSoldes] = useState<SoldePolytex[]>([]);
  const [prets, setPrets] = useState<Pret[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSolde, setShowSolde] = useState(false);
  const [showLoan, setShowLoan] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [a, s, p] = await Promise.all([
      getAgent(agentId),
      getSoldesAgent(agentId),
      getPretsAgent(agentId),
    ]);
    setAgent(a);
    setSoldes(s);
    setPrets(p);
    setLoading(false);
  }, [agentId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="app">
        <div className="header">
          <button className="back-btn" onClick={onBack}>← Retour</button>
        </div>
        <div className="spinner" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="app">
        <div className="header">
          <button className="back-btn" onClick={onBack}>← Retour</button>
        </div>
        <div className="content">
          <div className="empty-state">Agent introuvable.</div>
        </div>
      </div>
    );
  }

  const isBlocked = agent.dernier_solde !== null && agent.dernier_solde < 0;
  const agentFullName = `${agent.nom} ${agent.prenom}`;

  return (
    <div className="app">
      {/* Header */}
      <div className="header">
        <button className="back-btn" onClick={onBack}>←</button>
        <div>
          <div className="header-title">{agent.nom} {agent.prenom}</div>
          {(agent.matricule || agent.service) && (
            <div className="header-sub">
              {[agent.matricule, agent.service].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
      </div>

      <div className="content">
        {/* Bandeau statut */}
        {agent.dernier_solde !== null ? (
          <div className={`banner ${isBlocked ? 'banner-blocked' : 'banner-ok'}`}>
            <div className="banner-title">
              {isBlocked ? '⛔ STOP — NE PAS PRÊTER' : '✅ AGENT OK'}
            </div>
            <div className="banner-detail">
              Solde Polytex : <strong>{agent.dernier_solde}</strong>
              {agent.date_dernier_solde && (
                <> · Dernier relevé : {fmtDateShort(agent.date_dernier_solde)}</>
              )}
            </div>
          </div>
        ) : (
          <div className="banner banner-none">
            <div className="banner-title">Aucun solde enregistré</div>
            <div className="banner-detail">Saisissez le solde Polytex de cet agent.</div>
          </div>
        )}

        {/* Bouton solde */}
        <button
          className={`btn ${isBlocked ? 'btn-ghost' : 'btn-primary'}`}
          onClick={() => setShowSolde(true)}
          style={{ border: isBlocked ? '2px solid var(--danger)' : undefined, color: isBlocked ? 'var(--danger)' : undefined }}
        >
          📊 Saisir un solde Polytex
        </button>

        {/* Historique soldes */}
        {soldes.length > 0 && (
          <>
            <div className="section-title">Historique des soldes ({soldes.length})</div>
            <div className="card" style={{ padding: '4px 16px' }}>
              {soldes.map(s => {
                const neg = s.solde < 0;
                const zero = s.solde === 0;
                return (
                  <div key={s.id} className="history-item">
                    <div className={`history-badge ${neg ? 'history-badge-negative' : zero ? 'history-badge-neutral' : 'history-badge-positive'}`}>
                      {s.solde > 0 ? '+' : ''}{s.solde}
                    </div>
                    <div>
                      <div className="history-text">
                        {neg ? <span className="text-danger">Bloqué</span> : <span className="text-success">OK</span>}
                      </div>
                      <div className="history-sub">{fmtDateTime(s.created_at)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Bouton prêt */}
        <button
          className="btn btn-secondary mt-16"
          onClick={() => setShowLoan(true)}
        >
          👕 Enregistrer un prêt de blouse
        </button>

        {/* Historique prêts */}
        {prets.length > 0 && (
          <>
            <div className="section-title">Historique des prêts ({prets.length})</div>
            <div className="card" style={{ padding: '4px 16px' }}>
              {prets.map(p => {
                const detail = Object.entries(p.articles)
                  .map(([art, qty]) => `${art} ×${qty}`)
                  .join(', ');
                return (
                  <div key={p.id} className="history-item">
                    <div className="history-badge history-badge-neutral" style={{ fontSize: 18 }}>
                      ×{p.quantite}
                    </div>
                    <div>
                      <div className="history-text">{detail}</div>
                      <div className="history-sub">
                        {fmtDateTime(p.created_at)}
                        {p.commentaire && <> · {p.commentaire}</>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {prets.length === 0 && soldes.length === 0 && (
          <div className="empty-state" style={{ marginTop: 32 }}>
            Aucun prêt ni solde enregistré pour cet agent.
          </div>
        )}
      </div>

      {/* Modaux */}
      {showSolde && (
        <SoldeModal
          agentId={agentId}
          agentName={agentFullName}
          onClose={() => setShowSolde(false)}
          onSaved={() => { setShowSolde(false); load(); }}
        />
      )}
      {showLoan && (
        <LoanModal
          agentId={agentId}
          agentName={agentFullName}
          onClose={() => setShowLoan(false)}
          onSaved={() => { setShowLoan(false); load(); }}
        />
      )}
    </div>
  );
}
