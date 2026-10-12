import type { AreaTipo, CubTable, Padrao, Project, Stage } from '../types';

export interface Budget {
  areaReal: number;
  areaEquivalente: number;
  cubM2: number | null;
  custoBase: number;
  etapas: (Stage & { valor: number })[];
  adicionais: { id: string; nome: string; percentual: number; valor: number }[];
  totalAdicionais: number;
  total: number;
  custoM2Real: number;
}

export function cubValor(cub: CubTable, p: Pick<Project, 'tipo' | 'padrao' | 'regime'>): number | null {
  return cub.valores[p.regime]?.[p.tipo]?.[p.padrao] ?? null;
}

export function areas(project: Project, tipos: AreaTipo[]) {
  const coef = new Map(tipos.map((t) => [t.id, t.coeficiente]));
  let real = 0;
  let equivalente = 0;
  for (const r of project.rooms) {
    real += r.area;
    equivalente += r.area * (coef.get(r.tipoArea) ?? 1);
  }
  return { real, equivalente };
}

export function calcBudget(project: Project, cub: CubTable, stages: Stage[], tipos: AreaTipo[]): Budget {
  const { real, equivalente } = areas(project, tipos);
  const cubM2 = cubValor(cub, project);
  const custoBase = (cubM2 ?? 0) * equivalente;
  const somaPct = stages.reduce((s, e) => s + e.percentual, 0) || 1;
  const etapas = stages.map((e) => ({ ...e, valor: (custoBase * e.percentual) / somaPct }));
  const adicionais = project.adicionais
    .filter((a) => a.ativo)
    .map((a) => ({ id: a.id, nome: a.nome, percentual: a.percentual, valor: (custoBase * a.percentual) / 100 }));
  const totalAdicionais = adicionais.reduce((s, a) => s + a.valor, 0);
  const total = custoBase + totalAdicionais;
  return {
    areaReal: real,
    areaEquivalente: equivalente,
    cubM2,
    custoBase,
    etapas,
    adicionais,
    totalAdicionais,
    total,
    custoM2Real: real > 0 ? total / real : 0,
  };
}

export function compararPadroes(project: Project, cub: CubTable, stages: Stage[], tipos: AreaTipo[]) {
  return (['baixo', 'normal', 'alto'] as Padrao[]).map((padrao) => {
    const b = calcBudget({ ...project, padrao }, cub, stages, tipos);
    return { padrao, total: b.cubM2 === null ? null : b.total, cubM2: b.cubM2 };
  });
}

export interface MesCronograma {
  mes: number;
  valor: number;
  acumulado: number;
  acumuladoPct: number;
  porEtapa: Record<string, number>;
}

/** Cronograma físico-financeiro: distribui cada etapa uniformemente na sua janela. */
export function cronograma(budget: Budget, meses: number): MesCronograma[] {
  const n = Math.max(1, Math.round(meses));
  const out: MesCronograma[] = Array.from({ length: n }, (_, i) => ({
    mes: i + 1,
    valor: 0,
    acumulado: 0,
    acumuladoPct: 0,
    porEtapa: {},
  }));
  const distribuir = (id: string, valor: number, inicio: number, fim: number) => {
    const ini = inicio * n;
    const end = Math.max(fim * n, ini + 1e-6);
    for (let m = 0; m < n; m++) {
      const overlap = Math.max(0, Math.min(end, m + 1) - Math.max(ini, m));
      if (overlap > 0) {
        const v = (valor * overlap) / (end - ini);
        out[m].valor += v;
        out[m].porEtapa[id] = (out[m].porEtapa[id] ?? 0) + v;
      }
    }
  };
  for (const e of budget.etapas) distribuir(e.id, e.valor, e.inicio, e.fim);
  // Adicionais: fundações e projetos no início; demais ao longo da obra.
  for (const a of budget.adicionais) {
    if (a.id === 'projetos' || a.id === 'taxas') distribuir(a.id, a.valor, 0, 0.1);
    else if (a.id === 'fundacoes') distribuir(a.id, a.valor, 0.03, 0.2);
    else distribuir(a.id, a.valor, 0, 1);
  }
  let acc = 0;
  for (const m of out) {
    acc += m.valor;
    m.acumulado = acc;
    m.acumuladoPct = budget.total > 0 ? (acc / budget.total) * 100 : 0;
  }
  return out;
}

export function realizadoPorEtapa(project: Project) {
  const map: Record<string, number> = {};
  for (const e of project.expenses) map[e.etapaId] = (map[e.etapaId] ?? 0) + e.valor;
  return map;
}
