import * as XLSX from 'xlsx';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { getPretsJour, getSoldesJour } from './database';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function dateLabel(): string {
  const d = new Date();
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}

function splitDateTime(isoStr: string) {
  const d = new Date(isoStr);
  return {
    date: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`,
    heure: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

export async function exportRapportJour(): Promise<void> {
  const [prets, soldes] = await Promise.all([getPretsJour(), getSoldesJour()]);

  const wb = XLSX.utils.book_new();

  // Feuille 1 : Prêts du jour
  const wsPrets = XLSX.utils.aoa_to_sheet([
    ['Date', 'Heure', 'Nom', 'Prénom', 'Matricule', 'Service', 'Articles', 'Quantité', 'Commentaire'],
    ...prets.map(p => {
      const { date, heure } = splitDateTime(p.created_at);
      const articlesStr = Object.entries(p.articles).map(([a, q]) => `${a} ×${q}`).join(', ');
      return [date, heure, p.nom, p.prenom, p.matricule ?? '', p.service ?? '', articlesStr, p.quantite, p.commentaire ?? ''];
    }),
  ]);
  // Largeurs colonnes
  wsPrets['!cols'] = [{ wch: 12 }, { wch: 8 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 20 }, { wch: 24 }, { wch: 10 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsPrets, 'Prêts du jour');

  // Feuille 2 : Soldes Polytex du jour
  const wsSoldes = XLSX.utils.aoa_to_sheet([
    ['Date', 'Heure', 'Nom', 'Prénom', 'Matricule', 'Service', 'Solde', 'Statut'],
    ...soldes.map(s => {
      const { date, heure } = splitDateTime(s.created_at);
      return [date, heure, s.nom, s.prenom, s.matricule ?? '', s.service ?? '', s.solde, s.solde < 0 ? 'Bloqué' : 'OK'];
    }),
  ]);
  wsSoldes['!cols'] = [{ wch: 12 }, { wch: 8 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 20 }, { wch: 8 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, wsSoldes, 'Soldes Polytex du jour');

  const fileName = `Incidents_DAV_${dateLabel()}.xlsx`;

  if (Capacitor.getPlatform() === 'web') {
    XLSX.writeFile(wb, fileName);
    return;
  }

  // Android : écriture dans le cache puis partage
  const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' }) as string;

  const writeResult = await Filesystem.writeFile({
    path: fileName,
    data: base64,
    directory: Directory.Cache,
  });

  const today = new Date();
  const label = `${pad(today.getDate())}/${pad(today.getMonth() + 1)}/${today.getFullYear()}`;

  await Share.share({
    title: `Incidents DAV — ${label}`,
    text: `Rapport des incidents DAV du ${label}`,
    url: writeResult.uri,
    dialogTitle: 'Partager le rapport Excel',
  });
}
