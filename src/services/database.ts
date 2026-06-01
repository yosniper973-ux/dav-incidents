import { Capacitor } from '@capacitor/core';
import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
} from '@capacitor-community/sqlite';
import type { Agent, AgentWithSolde, SoldePolytex, Pret, PretExport, SoldeExport } from '../types';

const sqlite = new SQLiteConnection(CapacitorSQLite);
const DB_NAME = 'dav_incidents';
const DB_VERSION = 1;

let db: SQLiteDBConnection | null = null;
let initPromise: Promise<void> | null = null;

// ── Date helpers ──────────────────────────────────────────────────────────────

export function nowLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function todayLocal(): string {
  return nowLocal().slice(0, 10);
}

export function joursSince(isoStr: string): number {
  const diffMs = Date.now() - new Date(isoStr).getTime();
  return Math.floor(diffMs / 86_400_000);
}

async function saveIfWeb(): Promise<void> {
  if (Capacitor.getPlatform() === 'web') {
    await sqlite.saveToStore(DB_NAME);
  }
}

function getDb(): SQLiteDBConnection {
  if (!db) throw new Error('Base de données non initialisée.');
  return db;
}

// ── Initialisation ────────────────────────────────────────────────────────────

export async function initDatabase(): Promise<void> {
  if (db) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (Capacitor.getPlatform() === 'web') {
      await customElements.whenDefined('jeep-sqlite');
      await sqlite.initWebStore();
    }

    const consistency = await sqlite.checkConnectionsConsistency();
    const isConn = (await sqlite.isConnection(DB_NAME, false)).result;

    if (consistency.result && isConn) {
      db = await sqlite.retrieveConnection(DB_NAME, false);
    } else {
      db = await sqlite.createConnection(DB_NAME, false, 'no-encryption', DB_VERSION, false);
    }

    await db.open();

    await db.execute(`
      CREATE TABLE IF NOT EXISTS agents (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        nom         TEXT NOT NULL,
        prenom      TEXT NOT NULL,
        matricule   TEXT,
        service     TEXT,
        created_at  TEXT NOT NULL
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS soldes_polytex (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id    INTEGER NOT NULL,
        solde       INTEGER NOT NULL,
        created_at  TEXT NOT NULL,
        FOREIGN KEY (agent_id) REFERENCES agents(id)
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS prets (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id    INTEGER NOT NULL,
        articles    TEXT NOT NULL,
        quantite    INTEGER NOT NULL,
        commentaire TEXT,
        created_at  TEXT NOT NULL,
        FOREIGN KEY (agent_id) REFERENCES agents(id)
      );
    `);

    await saveIfWeb();
  })();

  return initPromise;
}

// ── Agents ────────────────────────────────────────────────────────────────────

function mapAgent(row: Record<string, unknown>): AgentWithSolde {
  return {
    id: row.id as number,
    nom: row.nom as string,
    prenom: row.prenom as string,
    matricule: (row.matricule as string | null) ?? null,
    service: (row.service as string | null) ?? null,
    created_at: row.created_at as string,
    dernier_solde: row.dernier_solde != null ? Number(row.dernier_solde) : null,
    date_dernier_solde: (row.date_dernier_solde as string | null) ?? null,
  };
}

const WITH_SOLDE = `
  SELECT
    a.*,
    (SELECT solde      FROM soldes_polytex WHERE agent_id = a.id ORDER BY id DESC LIMIT 1) AS dernier_solde,
    (SELECT created_at FROM soldes_polytex WHERE agent_id = a.id ORDER BY id DESC LIMIT 1) AS date_dernier_solde
  FROM agents a
`;

export async function searchAgents(query: string): Promise<AgentWithSolde[]> {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const conditions = words.map(
    () => `(LOWER(a.nom) LIKE ? OR LOWER(a.prenom) LIKE ? OR LOWER(COALESCE(a.matricule,'')) LIKE ?)`
  );
  const params = words.flatMap(w => [`%${w}%`, `%${w}%`, `%${w}%`]);

  const sql = `${WITH_SOLDE} WHERE ${conditions.join(' AND ')} ORDER BY a.nom, a.prenom`;
  const res = await getDb().query(sql, params);
  return (res.values ?? []).map(mapAgent);
}

export async function getAgent(id: number): Promise<AgentWithSolde | null> {
  const res = await getDb().query(`${WITH_SOLDE} WHERE a.id = ?`, [id]);
  const rows = res.values ?? [];
  return rows.length > 0 ? mapAgent(rows[0]) : null;
}

export async function createAgent(
  nom: string,
  prenom: string,
  matricule: string | null,
  service: string | null
): Promise<number> {
  const res = await getDb().run(
    `INSERT INTO agents (nom, prenom, matricule, service, created_at) VALUES (?, ?, ?, ?, ?)`,
    [nom.trim(), prenom.trim(), matricule?.trim() || null, service?.trim() || null, nowLocal()]
  );
  await saveIfWeb();
  return res.changes?.lastId ?? 0;
}

export async function importAgents(
  agents: { nom: string; prenom: string; matricule: string | null; service: string | null }[]
): Promise<{ created: number; skipped: number }> {
  let created = 0, skipped = 0;
  for (const a of agents) {
    if (a.matricule) {
      const existing = await getDb().query(
        'SELECT id FROM agents WHERE matricule = ?', [a.matricule.trim()]
      );
      if ((existing.values ?? []).length > 0) { skipped++; continue; }
    }
    await getDb().run(
      'INSERT INTO agents (nom, prenom, matricule, service, created_at) VALUES (?, ?, ?, ?, ?)',
      [a.nom.trim(), a.prenom.trim(), a.matricule?.trim() || null, a.service?.trim() || null, nowLocal()]
    );
    created++;
  }
  await saveIfWeb();
  return { created, skipped };
}

export async function deleteAgent(id: number): Promise<void> {
  await getDb().run(`DELETE FROM prets WHERE agent_id = ?`, [id]);
  await getDb().run(`DELETE FROM soldes_polytex WHERE agent_id = ?`, [id]);
  await getDb().run(`DELETE FROM agents WHERE id = ?`, [id]);
  await saveIfWeb();
}

export async function updateAgent(
  id: number,
  nom: string,
  prenom: string,
  matricule: string | null,
  service: string | null
): Promise<void> {
  await getDb().run(
    `UPDATE agents SET nom = ?, prenom = ?, matricule = ?, service = ? WHERE id = ?`,
    [nom.trim(), prenom.trim(), matricule?.trim() || null, service?.trim() || null, id]
  );
  await saveIfWeb();
}

export async function getAgentsSansSolde(): Promise<AgentWithSolde[]> {
  const sql = `${WITH_SOLDE}
    WHERE NOT EXISTS (SELECT 1 FROM soldes_polytex WHERE agent_id = a.id)
    ORDER BY a.created_at DESC
  `;
  const res = await getDb().query(sql, []);
  return (res.values ?? []).map(mapAgent);
}

export async function getAgentsBlockes(): Promise<AgentWithSolde[]> {
  // JOIN sur le dernier solde par agent, filtre solde < 0 par ligne (HAVING sans GROUP BY est incorrect)
  const sql = `
    SELECT
      a.*,
      s.solde      AS dernier_solde,
      s.created_at AS date_dernier_solde
    FROM agents a
    JOIN (
      SELECT agent_id, solde, created_at
      FROM soldes_polytex
      WHERE id IN (SELECT MAX(id) FROM soldes_polytex GROUP BY agent_id)
    ) s ON s.agent_id = a.id
    WHERE s.solde < 0
    ORDER BY s.created_at ASC
  `;
  const res = await getDb().query(sql, []);
  return (res.values ?? []).map(mapAgent);
}

// ── Soldes Polytex ────────────────────────────────────────────────────────────

export async function addSolde(agentId: number, solde: number): Promise<void> {
  await getDb().run(
    `INSERT INTO soldes_polytex (agent_id, solde, created_at) VALUES (?, ?, ?)`,
    [agentId, solde, nowLocal()]
  );
  await saveIfWeb();
}

export async function getSoldesAgent(agentId: number): Promise<SoldePolytex[]> {
  const res = await getDb().query(
    `SELECT * FROM soldes_polytex WHERE agent_id = ? ORDER BY id DESC`,
    [agentId]
  );
  return (res.values ?? []).map(row => ({
    id: row.id as number,
    agent_id: row.agent_id as number,
    solde: row.solde as number,
    created_at: row.created_at as string,
  }));
}

// ── Prêts ─────────────────────────────────────────────────────────────────────

function parseArticlesField(raw: string, quantite: number): Record<string, number> {
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) {
    const result: Record<string, number> = {};
    for (const a of parsed as string[]) result[a] = quantite;
    return result;
  }
  return parsed as Record<string, number>;
}

export async function addPret(
  agentId: number,
  articles: Record<string, number>,
  commentaire: string | null
): Promise<void> {
  const quantite = Object.values(articles).reduce((s, n) => s + n, 0);
  await getDb().run(
    `INSERT INTO prets (agent_id, articles, quantite, commentaire, created_at) VALUES (?, ?, ?, ?, ?)`,
    [agentId, JSON.stringify(articles), quantite, commentaire?.trim() || null, nowLocal()]
  );
  await saveIfWeb();
}

export async function getPretsAgent(agentId: number): Promise<Pret[]> {
  const res = await getDb().query(
    `SELECT * FROM prets WHERE agent_id = ? ORDER BY id DESC`,
    [agentId]
  );
  return (res.values ?? []).map(row => ({
    id: row.id as number,
    agent_id: row.agent_id as number,
    articles: parseArticlesField(row.articles as string, row.quantite as number),
    quantite: row.quantite as number,
    commentaire: (row.commentaire as string | null) ?? null,
    created_at: row.created_at as string,
  }));
}

// ── Export par période ────────────────────────────────────────────────────────

export async function getPretsRange(from: string, to: string): Promise<PretExport[]> {
  const res = await getDb().query(
    `SELECT p.*, a.nom, a.prenom, a.matricule, a.service
     FROM prets p JOIN agents a ON a.id = p.agent_id
     WHERE substr(p.created_at, 1, 10) >= ? AND substr(p.created_at, 1, 10) <= ?
     ORDER BY p.created_at`,
    [from, to]
  );
  return (res.values ?? []).map(row => ({
    id: row.id as number,
    agent_id: row.agent_id as number,
    articles: parseArticlesField(row.articles as string, row.quantite as number),
    quantite: row.quantite as number,
    commentaire: (row.commentaire as string | null) ?? null,
    created_at: row.created_at as string,
    nom: row.nom as string,
    prenom: row.prenom as string,
    matricule: (row.matricule as string | null) ?? null,
    service: (row.service as string | null) ?? null,
  }));
}

export async function getSoldesRange(from: string, to: string): Promise<SoldeExport[]> {
  const res = await getDb().query(
    `SELECT s.*, a.nom, a.prenom, a.matricule, a.service
     FROM soldes_polytex s JOIN agents a ON a.id = s.agent_id
     WHERE substr(s.created_at, 1, 10) >= ? AND substr(s.created_at, 1, 10) <= ?
     ORDER BY s.created_at`,
    [from, to]
  );
  return (res.values ?? []).map(row => ({
    id: row.id as number,
    agent_id: row.agent_id as number,
    solde: row.solde as number,
    created_at: row.created_at as string,
    nom: row.nom as string,
    prenom: row.prenom as string,
    matricule: (row.matricule as string | null) ?? null,
    service: (row.service as string | null) ?? null,
  }));
}
