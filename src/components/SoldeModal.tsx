import { useState } from 'react';
import { addSolde } from '../services/database';

interface Props {
  agentId: number;
  agentName: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function SoldeModal({ agentId, agentName, onClose, onSaved }: Props) {
  const [raw, setRaw] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const parsed = parseInt(raw, 10);
  const isValid = raw.trim() !== '' && !isNaN(parsed);
  const willBlock = isValid && parsed < 0;

  async function handleSave() {
    if (!isValid) { setError('Saisissez un nombre entier (peut être négatif).'); return; }
    setLoading(true);
    setError('');
    try {
      await addSolde(agentId, parsed);
      onSaved();
    } catch (e) {
      setError(String(e));
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-title">Solde Polytex — {agentName}</div>

        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
          Saisissez le chiffre lu sur Polytex. Un solde négatif bloque automatiquement l'agent.
        </p>

        {error && <div className="error-box" style={{ marginBottom: 14 }}>{error}</div>}

        <div className="field">
          <label className="label">Solde du compte Polytex</label>
          <input
            className="input input-large"
            type="number"
            inputMode="numeric"
            placeholder="0"
            value={raw}
            onChange={e => setRaw(e.target.value)}
            autoFocus
          />
        </div>

        {isValid && (
          <div
            className="banner"
            style={{
              background: willBlock ? 'var(--danger-dark)' : 'var(--success-bg)',
              border: `2px solid ${willBlock ? 'var(--danger)' : 'var(--success)'}`,
              color: willBlock ? '#fff' : 'var(--success)',
              marginBottom: 16,
            }}
          >
            <div className="banner-title">
              {willBlock ? '⛔ Agent sera BLOQUÉ' : '✅ Agent sera OK'}
            </div>
            <div className="banner-detail">Solde : {parsed}</div>
          </div>
        )}

        <button
          className={`btn mt-8 ${willBlock ? 'btn-danger' : 'btn-primary'}`}
          onClick={handleSave}
          disabled={!isValid || loading}
        >
          {loading ? 'Enregistrement…' : 'Enregistrer ce solde'}
        </button>
        <button className="btn btn-secondary mt-8" onClick={onClose}>
          Annuler
        </button>
      </div>
    </div>
  );
}
