const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const brlCompact = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' });
const num = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

export const fmtBRL = (v: number) => brl.format(v);
export const fmtBRLCompact = (v: number) => brlCompact.format(v);
export const fmtNum = (v: number) => num.format(v);
export const fmtM2 = (v: number) => `${num.format(v)} m²`;
export const fmtPct = (v: number) => `${num.format(v)}%`;

/** Converte "1.234,56" ou "1234.56" em número. */
export function parseNum(s: string): number {
  const t = s.trim();
  if (!t) return 0;
  const normalized = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}
