import { useState } from 'react';
import { createAgent } from '../services/database';

interface Props {
  onClose: () => void;
  onCreated: (agentId: number) => void;
  prefill?: string;
}

export default function CreateAgentModal({ onClose, onCreated, prefill = '' }: Props) {
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState(() => {
    const parts = prefill.trim().split(/\s+/);
    return parts.length > 1 ? parts.slice(1).join(' ') : '';
  });
  const [matricule, setMatricule] = useState('');
  const [service, setService] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill nom from prefill (first word)
  useState(() => {
    const parts = prefill.trim().split(/\s+/);
    if (parts.length >= 1) setNom(parts[0]);
  });

  async function handleSubmit() {
    if (!nom.trim()) { setError('Le nom est obligatoire.'); return; }
    if (!prenom.trim()) { setError('Le prénom est obligatoire.'); return; }
    setLoading(true);
    setError('');
    try {
      const id = await createAgent(nom, prenom, matricule || null, service || null);
      onCreated(id);
    } catch (e) {
      setError(String(e));
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-title">Nouvelle fiche agent</div>

        {error && <div className="error-box" style={{ marginBottom: 14 }}>{error}</div>}

        <div className="field">
          <label className="label">Nom *</label>
          <input
            className="input"
            placeholder="NOM"
            value={nom}
            onChange={e => setNom(e.target.value)}
            autoCapitalize="characters"
          />
        </div>

        <div className="field">
          <label className="label">Prénom *</label>
          <input
            className="input"
            placeholder="Prénom"
            value={prenom}
            onChange={e => setPrenom(e.target.value)}
            autoCapitalize="words"
          />
        </div>

        <div className="field">
          <label className="label">Matricule (facultatif)</label>
          <input
            className="input"
            placeholder="Ex : 12345"
            value={matricule}
            onChange={e => setMatricule(e.target.value)}
            inputMode="text"
          />
        </div>

        <div className="field">
          <label className="label">Service (facultatif)</label>
          <input
            className="input"
            placeholder="Ex : Chirurgie B, Urgences…"
            value={service}
            onChange={e => setService(e.target.value)}
            autoCapitalize="words"
          />
        </div>

        <button
          className="btn btn-primary mt-16"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Enregistrement…' : 'Créer la fiche'}
        </button>
        <button className="btn btn-secondary mt-8" onClick={onClose}>
          Annuler
        </button>
      </div>
    </div>
  );
}
