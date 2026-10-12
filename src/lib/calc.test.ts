import { describe, expect, it } from 'vitest';
import { calcBudget, cronograma } from './calc';
import { ADICIONAIS_PADRAO, AREA_TIPOS_PADRAO, CUB_SP_PADRAO, ETAPAS_PADRAO } from '../data/referencias';
import type { Project } from '../types';

const project: Project = {
  id: 'p',
  nome: 'Teste',
  cidade: 'São Paulo',
  tipo: 'R1',
  padrao: 'normal',
  regime: 'naoDesonerado',
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

  it('cronograma distribui 100% do total', () => {
    const m = cronograma(b, project.duracaoMeses);
    expect(m).toHaveLength(10);
    expect(m[9].acumulado).toBeCloseTo(b.total);
  });

  it('retorna CUB nulo quando não publicado', () => {
    expect(calcBudget({ ...project, tipo: 'R16', padrao: 'baixo' }, CUB_SP_PADRAO, ETAPAS_PADRAO, AREA_TIPOS_PADRAO).cubM2).toBeNull();
  });
});
