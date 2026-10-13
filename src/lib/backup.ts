import type { AppData } from '../types';
import { normalizeProject, normalizeStage } from './migrate';

const APP = 'buildingyourhouse';
const VERSION = 2;

interface BackupFile {
  app: typeof APP;
  version: number;
  exportedAt: string;
  data: AppData;
}

export function exportBackup(data: AppData) {
  const file: BackupFile = { app: APP, version: VERSION, exportedAt: new Date().toISOString(), data };
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `buildingyourhouse-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function readBackup(file: File): Promise<AppData> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error('Arquivo não é um JSON válido.');
  }
  const f = parsed as Partial<BackupFile>;
  if (f?.app !== APP || !f.data) throw new Error('Arquivo não é um backup do BuildingYourHouse.');
  if ((f.version ?? 0) > VERSION) throw new Error('Backup gerado por uma versão mais nova do app.');
  const d = f.data;
  if (!Array.isArray(d.projects) || !d.cub || !Array.isArray(d.stages) || !Array.isArray(d.areaTipos)) {
    throw new Error('Backup incompleto ou corrompido.');
  }
  for (const p of d.projects) {
    if (typeof p.id !== 'string' || !Array.isArray(p.rooms)) throw new Error('Projeto inválido no backup.');
  }
  return { ...d, projects: d.projects.map(normalizeProject), stages: d.stages.map(normalizeStage) };
}
