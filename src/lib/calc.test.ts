import { describe, expect, it } from 'vitest';
import { calcBudget, cronograma } from './calc';
import { ADICIONAIS_PADRAO, AREA_TIPOS_PADRAO, CUB_SP_PADRAO, ETAPAS_PADRAO, aplicarContratacao } from '../data/referencias';
import type { Project } from '../types';

const project: Project = {
  id: 'p',
  nome: 'Teste',
  cidade: 'São Paulo',
  tipo: 'R1',
  padrao: 'normal',
  regime: 'naoDesonerado',
  contratacao: 'empreitada',
  ajusteMaoDeObra: 85,
  duracaoMeses: 10,
  observacoes: '',
  rooms: [
    { id: '1', nome: 'Sala', area: 100, tipoArea: 'principal', origem: 'manual' },
    { id: '2', nome: 'Garagem', area: 20, tipoArea: 'garagem', origem: 'manual' },
  ],
  adicionais: ADICIONAIS_PADRAO.map((a) => ({ ...a, ativo: a.id === 'fundacoes' })),
  expenses: [],
  criadoEm: '',
  atualizadoEm: '',
};

describe('calcBudget', () => {
  const b = calcBudget(project, CUB_SP_PADRAO, ETAPAS_PADRAO, AREA_TIPOS_PADRAO);

  it('usa área equivalente da NBR 12721', () => {
    expect(b.areaReal).toBe(120);
    expect(b.areaEquivalente).toBe(115);
  });

  it('custo base = CUB × área equivalente, adicionais somados', () => {
    expect(b.custoBase).toBeCloseTo(2686.65 * 115);
    expect(b.total).toBeCloseTo(2686.65 * 115 * 1.06);
    expect(b.etapas.reduce((s, e) => s + e.valor, 0)).toBeCloseTo(b.custoBase);
  });

  it('divide cada etapa em material e mão de obra', () => {
    expect(b.totalMaterial + b.totalMaoDeObra).toBeCloseTo(b.custoBase);
    const estrutura = b.etapas.find((e) => e.id === 'estrutura')!;
    expect(estrutura.valorMaoDeObra / estrutura.valor).toBeCloseTo(0.55);
    expect(b.totalMaoDeObra / b.custoBase).toBeGreaterThan(0.5);
  });

  it('autoconstrução ajusta a mão de obra e cobra INSS sobre ela, sem BDI', () => {
    const p = { ...project, contratacao: 'autoconstrucao' as const, adicionais: aplicarContratacao(ADICIONAIS_PADRAO, 'autoconstrucao') };
    const a = calcBudget(p, CUB_SP_PADRAO, ETAPAS_PADRAO, AREA_TIPOS_PADRAO);
    expect(a.totalMaterial).toBeCloseTo(b.totalMaterial);
    expect(a.totalMaoDeObra).toBeCloseTo(b.totalMaoDeObra * 0.85);
    expect(a.adicionais.find((x) => x.id === 'inssObra')!.valor).toBeCloseTo(a.totalMaoDeObra * 0.2);
    expect(a.adicionais.some((x) => x.id === 'administracao')).toBe(false);
  });

  it('empreitada inclui BDI sobre o custo direto', () => {
    const p = { ...project, adicionais: aplicarContratacao(ADICIONAIS_PADRAO, 'empreitada') };
    const e = calcBudget(p, CUB_SP_PADRAO, ETAPAS_PADRAO, AREA_TIPOS_PADRAO);
    expect(e.adicionais.find((x) => x.id === 'administracao')!.valor).toBeCloseTo(e.custoDireto * 0.2);
  });

  it('cronograma distribui 100% do total', () => {
    const m = cronograma(b, project.duracaoMeses);
    expect(m).toHaveLength(10);
    expect(m[9].acumulado).toBeCloseTo(b.total);
  });

  it('retorna CUB nulo quando não publicado', () => {
    expect(calcBudget({ ...project, tipo: 'R16', padrao: 'baixo' }, CUB_SP_PADRAO, ETAPAS_PADRAO, AREA_TIPOS_PADRAO).cubM2).toBeNull();
  });
});
