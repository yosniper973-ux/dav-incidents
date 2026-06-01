import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { importAgents } from '../services/database';

interface Props {
  onClose: () => void;
  onImported: () => void;
}

interface AgentRow {
  nom: string;
  prenom: string;
  matricule: string | null;
  service: string | null;
}

type ColMap = { nom: string; prenom: string; matricule: string; service: string };

// Normalise un header pour la détection automatique
function normalize(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]/g, '');
}

const NOM_KEYS     = ['nom', 'name', 'lastname', 'familyname'];
const PRENOM_KEYS  = ['prenom', 'firstname', 'givenname'];
const MAT_KEYS     = ['matricule', 'mat', 'numeromatricule', 'badge', 'id', 'employeeid', 'numero'];
const SERVICE_KEYS = ['service', 'department', 'dept', 'departement', 'unite', 'uf', 'poste'];

function detectCol(headers: string[], keys: string[]): string {
  return headers.find(h => keys.some(k => normalize(h).includes(k))) ?? '';
}

export default function ImportModal({ onClose, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'pick' | 'map' | 'preview' | 'done'>('pick');
  const [error, setError] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [colMap, setColMap] = useState<ColMap>({ nom: '', prenom: '', matricule: '', service: '' });
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);

  // ── Lecture du fichier ─────────────────────────────────────────────────────

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });
        if (rows.length === 0) { setError('Le fichier est vide ou non reconnu.'); return; }
        const hdrs = Object.keys(rows[0]);
        const detected: ColMap = {
          nom:        detectCol(hdrs, NOM_KEYS),
          prenom:     detectCol(hdrs, PRENOM_KEYS),
          matricule:  detectCol(hdrs, MAT_KEYS),
          service:    detectCol(hdrs, SERVICE_KEYS),
        };
        setHeaders(hdrs);
        setRawRows(rows as Record<string, string>[]);
        setColMap(detected);
        // Nom + Prénom obligatoires
        if (detected.nom && detected.prenom) {
          buildPreview(rows as Record<string, string>[], detected);
        } else {
          setStep('map');
        }
      } catch {
        setError('Impossible de lire le fichier. Vérifiez qu\'il s\'agit d\'un CSV ou Excel valide.');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function buildPreview(rows: Record<string, string>[], map: ColMap) {
    const list: AgentRow[] = rows
      .map(r => ({
        nom:        (r[map.nom] ?? '').toString().trim().toUpperCase(),
        prenom:     (r[map.prenom] ?? '').toString().trim(),
        matricule:  map.matricule ? (r[map.matricule] ?? '').toString().trim() || null : null,
        service:    map.service   ? (r[map.service]   ?? '').toString().trim() || null : null,
      }))
      .filter(a => a.nom && a.prenom);
    if (list.length === 0) { setError('Aucun agent valide détecté (nom/prénom vides ?).'); return; }
    setAgents(list);
    setStep('preview');
  }

  function confirmMap() {
    if (!colMap.nom || !colMap.prenom) {
      setError('Les colonnes Nom et Prénom sont obligatoires.');
      return;
    }
    setError('');
    buildPreview(rawRows, colMap);
  }

  async function handleImport() {
    setImporting(true);
    try {
      const res = await importAgents(agents);
      setResult(res);
      setStep('done');
      onImported();
    } catch (e) {
      setError(String(e));
    }
    setImporting(false);
  }

  // ── Rendu ──────────────────────────────────────────────────────────────────

  const btnStyle: React.CSSProperties = {
    flex: 1, padding: '8px 4px', fontSize: 12, fontWeight: 600,
    borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--card)', color: 'var(--text-muted)', cursor: 'pointer',
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh', overflowY: 'auto' }}>
        <div className="modal-handle" />
        <div className="modal-title">Importer des agents</div>

        {error && <div className="error-box" style={{ marginBottom: 14 }}>{error}</div>}

        {/* ── ÉTAPE 1 : Choisir le fichier ── */}
        {step === 'pick' && (
          <>
            <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
              Exportez la liste de vos agents depuis Polytex en <strong style={{ color: 'var(--text)' }}>CSV</strong> ou <strong style={{ color: 'var(--text)' }}>Excel</strong>, puis sélectionnez le fichier ci-dessous.
            </div>

            <div style={{
              border: '2px dashed var(--border)', borderRadius: 12,
              padding: 32, textAlign: 'center', marginBottom: 16,
              cursor: 'pointer', background: 'rgba(45,150,255,0.04)',
            }} onClick={() => fileRef.current?.click()}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📂</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>
                Sélectionner un fichier
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                CSV · Excel (.xlsx)
              </div>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              style={{ display: 'none' }}
              onChange={handleFile}
            />

            <div style={{
              background: 'var(--card)', borderRadius: 10,
              padding: '12px 14px', fontSize: 13, color: 'var(--text-muted)',
              border: '1px solid var(--border)', lineHeight: 1.7, marginBottom: 4,
            }}>
              <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>💡 Colonnes reconnues automatiquement :</div>
              <div>Nom · Prénom · Matricule · Service</div>
              <div style={{ marginTop: 4 }}>Les agents déjà présents (même matricule) ne seront pas dupliqués.</div>
            </div>

            <button className="btn btn-secondary mt-16" onClick={onClose}>Annuler</button>
          </>
        )}

        {/* ── ÉTAPE 2 : Mapping manuel des colonnes ── */}
        {step === 'map' && (
          <>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
              Les colonnes n'ont pas été reconnues automatiquement. Associez chaque champ à une colonne de votre fichier.
            </div>

            {(['nom', 'prenom', 'matricule', 'service'] as (keyof ColMap)[]).map(field => (
              <div className="field" key={field}>
                <label className="label">
                  {field === 'nom' ? 'Nom *' : field === 'prenom' ? 'Prénom *' : field === 'matricule' ? 'Matricule' : 'Service'}
                </label>
                <select
                  className="input"
                  value={colMap[field]}
                  onChange={e => setColMap(prev => ({ ...prev, [field]: e.target.value }))}
                  style={{ appearance: 'auto' }}
                >
                  <option value="">— Ne pas importer —</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}

            {/* Aperçu de la première ligne */}
            {rawRows[0] && colMap.nom && colMap.prenom && (
              <div style={{
                background: 'rgba(45,150,255,0.08)', border: '1px solid rgba(45,150,255,0.2)',
                borderRadius: 10, padding: '10px 14px', fontSize: 13,
                color: 'var(--text-muted)', marginBottom: 4,
              }}>
                <div style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: 4 }}>Aperçu première ligne :</div>
                <div>{(rawRows[0][colMap.nom] ?? '').toUpperCase()} {rawRows[0][colMap.prenom] ?? ''}</div>
                {colMap.matricule && <div>Matricule : {rawRows[0][colMap.matricule] ?? '—'}</div>}
                {colMap.service   && <div>Service : {rawRows[0][colMap.service] ?? '—'}</div>}
              </div>
            )}

            <button className="btn btn-primary mt-16" onClick={confirmMap}>Continuer</button>
            <button className="btn btn-secondary mt-8" onClick={onClose}>Annuler</button>
          </>
        )}

        {/* ── ÉTAPE 3 : Aperçu et confirmation ── */}
        {step === 'preview' && (
          <>
            <div style={{
              background: 'rgba(45,150,255,0.08)', border: '1px solid rgba(45,150,255,0.2)',
              borderRadius: 10, padding: '10px 14px', fontSize: 14,
              color: 'var(--primary)', fontWeight: 600, marginBottom: 16,
            }}>
              {agents.length} agent{agents.length > 1 ? 's' : ''} détecté{agents.length > 1 ? 's' : ''}
            </div>

            {/* Liste avec scroll */}
            <div style={{
              border: '1px solid var(--border)', borderRadius: 10,
              maxHeight: 260, overflowY: 'auto', marginBottom: 16,
            }}>
              {agents.map((a, i) => (
                <div key={i} style={{
                  padding: '10px 14px',
                  borderBottom: i < agents.length - 1 ? '1px solid var(--border)' : 'none',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{a.nom} {a.prenom}</div>
                    {(a.matricule || a.service) && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {[a.matricule, a.service].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
              Les agents avec un matricule déjà présent dans l'app seront ignorés.
            </div>

            <button className="btn btn-primary mt-16" onClick={handleImport} disabled={importing}>
              {importing ? 'Import en cours…' : `Importer ${agents.length} agent${agents.length > 1 ? 's' : ''}`}
            </button>
            <button className="btn btn-secondary mt-8" onClick={() => setStep('pick')}>Retour</button>
          </>
        )}

        {/* ── ÉTAPE 4 : Résultat ── */}
        {step === 'done' && result && (
          <>
            <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Import terminé</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 16 }}>
                <div style={{
                  background: 'rgba(63,185,80,0.1)', border: '1px solid rgba(63,185,80,0.3)',
                  borderRadius: 10, padding: '12px 20px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--success)' }}>{result.created}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Créé{result.created > 1 ? 's' : ''}</div>
                </div>
                {result.skipped > 0 && (
                  <div style={{
                    background: 'var(--card)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '12px 20px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-muted)' }}>{result.skipped}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ignoré{result.skipped > 1 ? 's' : ''}</div>
                  </div>
                )}
              </div>
            </div>
            <button className="btn btn-primary mt-16" onClick={onClose}>Fermer</button>
          </>
        )}
      </div>
    </div>
  );
}
