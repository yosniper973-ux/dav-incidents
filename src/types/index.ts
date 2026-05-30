export interface Agent {
  id: number;
  nom: string;
  prenom: string;
  matricule: string | null;
  service: string | null;
  created_at: string;
}

export interface AgentWithSolde extends Agent {
  dernier_solde: number | null;
  date_dernier_solde: string | null;
}

export interface SoldePolytex {
  id: number;
  agent_id: number;
  solde: number;
  created_at: string;
}

export interface Pret {
  id: number;
  agent_id: number;
  articles: Record<string, number>; // { Pantalon: 1, Tunique: 2 }
  quantite: number; // total = somme des valeurs
  commentaire: string | null;
  created_at: string;
}

export type ArticleType = 'Pantalon' | 'Tunique';

export const ARTICLES: ArticleType[] = ['Pantalon', 'Tunique'];

export interface PretExport extends Pret {
  nom: string;
  prenom: string;
  matricule: string | null;
  service: string | null;
}

export interface SoldeExport extends SoldePolytex {
  nom: string;
  prenom: string;
  matricule: string | null;
  service: string | null;
}
