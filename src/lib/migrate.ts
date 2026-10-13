import { ADICIONAIS_PADRAO, ETAPAS_PADRAO } from '../data/referencias';
import type { Project, Stage } from '../types';

/** Completa campos adicionados em versões novas, sem alterar valores já salvos. */
export function normalizeStage(s: Stage): Stage {
  return { ...s, maoDeObra: s.maoDeObra ?? ETAPAS_PADRAO.find((e) => e.id === s.id)?.maoDeObra ?? 50 };
}

export function normalizeProject(p: Project): Project {
  const adicionais = [...(p.adicionais ?? [])];
  for (const padrao of ADICIONAIS_PADRAO) {
    if (!adicionais.some((a) => a.id === padrao.id)) adicionais.push({ ...padrao, ativo: false });
  }
  return {
    ...p,
    contratacao: p.contratacao ?? 'empreitada',
    ajusteMaoDeObra: p.ajusteMaoDeObra ?? 85,
    expenses: p.expenses ?? [],
    adicionais,
  };
}
