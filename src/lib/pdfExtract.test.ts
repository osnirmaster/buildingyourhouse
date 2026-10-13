import { describe, expect, it } from 'vitest';
import { extractFromText, type PdfText } from './pdfExtract';

const t = (str: string, x: number, y: number, page = 1): PdfText => ({ str, x, y, width: str.length * 5, page });

describe('extractFromText', () => {
  it('associa nome e área na mesma linha', () => {
    const r = extractFromText([t('SALA DE ESTAR A=22,50m²', 100, 500)], 1);
    expect(r.rooms).toEqual([expect.objectContaining({ nome: 'Sala De Estar', area: 22.5, confianca: 'alta' })]);
  });

  it('associa área ao nome mais próximo acima', () => {
    const r = extractFromText(
      [t('SUÍTE 1', 100, 500), t('A: 14,30 m²', 100, 488), t('COZINHA', 300, 500), t('A: 9,80 m2', 300, 488), t('GARAGEM', 500, 300), t('ÁREA = 30,00', 500, 288)],
      1,
    );
    const byName = Object.fromEntries(r.rooms.map((x) => [x.nome, x]));
    expect(byName['Suíte 1'].area).toBe(14.3);
    expect(byName['Cozinha'].area).toBe(9.8);
    expect(byName['Garagem']).toMatchObject({ area: 30, tipoArea: 'garagem' });
  });

  it('lê área total e ignora área do terreno', () => {
    const r = extractFromText([t('ÁREA TOTAL CONSTRUÍDA: 1.234,56 m²', 50, 100), t('ÁREA DO TERRENO 300,00 m²', 50, 80)], 1);
    expect(r.areaTotal).toBe(1234.56);
    expect(r.rooms).toHaveLength(0);
  });

  it('marca repetição em outra página como possível duplicata', () => {
    const r = extractFromText([t('WC A=3,20m2', 10, 10, 1), t('WC A=3,20m2', 10, 10, 2)], 2);
    expect(r.rooms.map((x) => x.duplicata)).toEqual([false, true]);
  });

  it('ignora textos repetidos na mesma posição (export de CAD)', () => {
    const r = extractFromText([t('ACADEMIA', 100, 500), t('ACADEMIA', 100, 500), t('A: 24,25 M²', 100, 492), t('A: 24,25 M²', 100, 492)], 1);
    expect(r.rooms).toEqual([expect.objectContaining({ nome: 'Academia', area: 24.25 })]);
  });

  it('usa o texto acima como nome mesmo fora do dicionário, em duas linhas', () => {
    const r = extractFromText([t('RAMPA', 100, 510), t('DE ACESSO VEICULAR', 90, 502), t('A= 20,73m²', 100, 494), t('PISO CERÂMICO', 95, 487)], 1);
    expect(r.rooms[0]).toMatchObject({ nome: 'Rampa De Acesso Veicular', area: 20.73, tipoArea: 'externo' });
  });

  it('lê texto rotacionado 90°', () => {
    const rot = (str: string, x: number, y: number): PdfText => ({ str, x, y, width: str.length * 4, page: 1, dir: [0, 1], size: 5 });
    const r = extractFromText([{ ...rot('BANHO 02', 1329.8, 1387), size: 7 }, rot('A:', 1337.2, 1393), rot('03,06M²', 1337.2, 1399), rot('PISO CERÂMICO', 1344, 1385)], 1);
    expect(r.rooms).toEqual([expect.objectContaining({ nome: 'Banho 02', area: 3.06 })]);
  });

  it('avisa quando o PDF não tem texto', () => {
    expect(extractFromText([], 1).avisos[0]).toMatch(/digitalizado/);
  });
});
