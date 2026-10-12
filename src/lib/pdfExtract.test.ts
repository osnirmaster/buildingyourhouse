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
    expect(byName['Suite 1'].area).toBe(14.3);
    expect(byName['Cozinha'].area).toBe(9.8);
    expect(byName['Garagem']).toMatchObject({ area: 30, tipoArea: 'garagem' });
  });

  it('lê área total e ignora área do terreno', () => {
    const r = extractFromText([t('ÁREA TOTAL CONSTRUÍDA: 1.234,56 m²', 50, 100), t('ÁREA DO TERRENO 300,00 m²', 50, 80)], 1);
    expect(r.areaTotal).toBe(1234.56);
    expect(r.rooms).toHaveLength(0);
  });

  it('remove duplicatas entre páginas', () => {
    const r = extractFromText([t('WC A=3,20m2', 10, 10, 1), t('WC A=3,20m2', 10, 10, 2)], 2);
    expect(r.rooms).toHaveLength(1);
  });

  it('avisa quando o PDF não tem texto', () => {
    expect(extractFromText([], 1).avisos[0]).toMatch(/digitalizado/);
  });
});
