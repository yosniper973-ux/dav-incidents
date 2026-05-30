import { useState } from 'react';
import { exportRapport } from '../services/exportService';
import { todayLocal } from '../services/database';

interface Props {
  onClose: () => void;
}

function isoToDisplay(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export default function ExportModal({ onClose }: Props) {
  const today = todayLocal();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleExport() {
    if (from > to) {
      setError('La date de début doit être avant la date de fin.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await exportRapport(from, to);
      onClose();
    } catch (e) {
      setError(String(e));
      setLoading(false);
    }
  }

  // Raccourcis rapides
  function setToday() {
    setFrom(today);
    setTo(today);
  }

  function setThisMonth() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    setFrom(`${y}-${m}-01`);
    setTo(today);
  }

  function setThisYear() {
    const y = new Date().getFullYear();
    setFrom(`${y}-01-01`);
    setTo(today);
  }

  const sameDay = from === to;
  const label = sameDay
    ? `du ${isoToDisplay(from)}`
    : `du ${isoToDisplay(from)} au ${isoToDisplay(to)}`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-title">Exporter en Excel</div>

        {error && <div className="error-box" style={{ marginBottom: 14 }}>{error}</div>}

        {/* Raccourcis */}
        <div className="field">
          <label className="label">Période rapide</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { label: "Aujourd'hui", action: setToday },
              { label: 'Ce mois', action: setThisMonth },
              { label: 'Cette année', action: setThisYear },
            ].map(({ label, action }) => (
              <button
                key={label}
                onClick={action}
                style={{
                  flex: 1, padding: '8px 4px', fontSize: 12, fontWeight: 600,
                  borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--card)', color: 'var(--text-muted)', cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="label">Date de début</label>
          <input
            className="input"
            type="date"
            value={from}
            max={today}
            onChange={e => {
              setFrom(e.target.value);
              if (e.target.value > to) setTo(e.target.value);
            }}
          />
        </div>

        <div className="field">
          <label className="label">Date de fin</label>
          <input
            className="input"
            type="date"
            value={to}
            min={from}
            max={today}
            onChange={e => setTo(e.target.value)}
          />
        </div>

        {/* Résumé */}
        <div style={{
          background: 'rgba(45,150,255,0.08)', border: '1px solid rgba(45,150,255,0.2)',
          borderRadius: 10, padding: '10px 14px', fontSize: 14,
          color: 'var(--primary)', fontWeight: 600, marginBottom: 4,
        }}>
          📊 Rapport {label}
        </div>

        <button
          className="btn btn-primary mt-16"
          onClick={handleExport}
          disabled={loading}
        >
          {loading ? 'Génération…' : 'Générer et partager'}
        </button>
        <button className="btn btn-secondary mt-8" onClick={onClose}>
          Annuler
        </button>
      </div>
    </div>
  );
}
