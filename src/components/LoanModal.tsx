import { useState } from 'react';
import { addPret } from '../services/database';
import { ARTICLES, type ArticleType } from '../types';

interface Props {
  agentId: number;
  agentName: string;
  onClose: () => void;
  onSaved: () => void;
}

const MAX_QTY = 4;

export default function LoanModal({ agentId, agentName, onClose, onSaved }: Props) {
  const [quantities, setQuantities] = useState<Record<ArticleType, number>>(
    () => Object.fromEntries(ARTICLES.map(a => [a, 0])) as Record<ArticleType, number>
  );
  const [commentaire, setCommentaire] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const total = Object.values(quantities).reduce((s, n) => s + n, 0);

  function setQty(art: ArticleType, n: number) {
    setQuantities(prev => ({ ...prev, [art]: n }));
  }

  async function handleSave() {
    if (total === 0) {
      setError('Sélectionnez au moins un article.');
      return;
    }
    setLoading(true);
    setError('');
    const articles: Record<string, number> = {};
    for (const art of ARTICLES) {
      if (quantities[art] > 0) articles[art] = quantities[art];
    }
    try {
      await addPret(agentId, articles, commentaire || null);
      onSaved();
    } catch (e) {
      setError(String(e));
      setLoading(false);
    }
  }

  const summary = ARTICLES
    .filter(a => quantities[a] > 0)
    .map(a => `${a} ×${quantities[a]}`)
    .join(', ');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-title">Enregistrer un prêt — {agentName}</div>

        {error && <div className="error-box" style={{ marginBottom: 14 }}>{error}</div>}

        <div className="field">
          <label className="label">Quantité par article *</label>
          {ARTICLES.map(art => (
            <div key={art} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                {art}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {Array.from({ length: MAX_QTY + 1 }, (_, n) => (
                  <button
                    key={n}
                    onClick={() => setQty(art, n)}
                    style={{
                      flex: 1,
                      minHeight: 52,
                      fontSize: n === 0 ? 16 : 20,
                      fontWeight: 700,
                      borderRadius: 10,
                      border: `2px solid ${quantities[art] === n ? (n === 0 ? 'var(--border)' : 'var(--primary)') : 'var(--border)'}`,
                      background: quantities[art] === n ? (n === 0 ? 'var(--card)' : 'rgba(45,150,255,0.12)') : 'var(--card)',
                      color: quantities[art] === n ? (n === 0 ? 'var(--text-muted)' : 'var(--primary)') : 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    {n === 0 ? '—' : n}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {summary && (
          <div style={{
            background: 'rgba(45,150,255,0.08)',
            border: '1px solid rgba(45,150,255,0.25)',
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: 14,
            color: 'var(--primary)',
            fontWeight: 600,
            marginBottom: 4,
          }}>
            {summary}
          </div>
        )}

        <div className="field" style={{ marginTop: 14 }}>
          <label className="label">Commentaire (facultatif)</label>
          <input
            className="input"
            placeholder="Précisions éventuelles…"
            value={commentaire}
            onChange={e => setCommentaire(e.target.value)}
          />
        </div>

        <button
          className="btn btn-primary mt-16"
          onClick={handleSave}
          disabled={loading || total === 0}
        >
          {loading ? 'Enregistrement…' : total === 0 ? 'Sélectionnez des articles' : `Enregistrer (${summary})`}
        </button>
        <button className="btn btn-secondary mt-8" onClick={onClose}>
          Annuler
        </button>
      </div>
    </div>
  );
}
