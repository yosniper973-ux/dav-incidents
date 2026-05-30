import { useState } from 'react';
import { updateAgent } from '../services/database';
import type { Agent } from '../types';

interface Props {
  agent: Agent;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditAgentModal({ agent, onClose, onSaved }: Props) {
  const [nom, setNom] = useState(agent.nom);
  const [prenom, setPrenom] = useState(agent.prenom);
  const [matricule, setMatricule] = useState(agent.matricule ?? '');
  const [service, setService] = useState(agent.service ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!nom.trim()) { setError('Le nom est obligatoire.'); return; }
    if (!prenom.trim()) { setError('Le prénom est obligatoire.'); return; }
    setLoading(true);
    setError('');
    try {
      await updateAgent(agent.id, nom, prenom, matricule || null, service || null);
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
        <div className="modal-title">Modifier la fiche agent</div>

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
          <label className="label">Matricule</label>
          <input
            className="input"
            placeholder="Ex : 12345"
            value={matricule}
            onChange={e => setMatricule(e.target.value)}
            inputMode="text"
          />
        </div>

        <div className="field">
          <label className="label">Service</label>
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
          {loading ? 'Enregistrement…' : 'Enregistrer les modifications'}
        </button>
        <button className="btn btn-secondary mt-8" onClick={onClose}>
          Annuler
        </button>
      </div>
    </div>
  );
}
