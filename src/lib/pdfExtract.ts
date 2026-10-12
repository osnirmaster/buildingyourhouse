import { parseNum } from './format';

export interface PdfText {
  str: string;
  x: number;
  y: number;
  width: number;
  page: number;
}

export interface ExtractedRoom {
  nome: string;
  area: number;
  tipoArea: string;
  confianca: 'alta' | 'media' | 'baixa';
  pagina: number;
  trecho: string;
}

export interface PdfExtraction {
  rooms: ExtractedRoom[];
  areaTotal: number | null;
  paginas: number;
  avisos: string[];
}

interface Line {
  text: string;
  norm: string;
  x: number;
  y: number;
  page: number;
}

const NUM = String.raw`(\d{1,3}(?:\.\d{3})+,\d{1,2}|\d{1,5}(?:[.,]\d{1,2})?)`;
const UNIT = String.raw`(?:M\s?²|M\s?2\b|M\^2)`;
const TOTAL_RE = new RegExp(String.raw`\b(?:AREA\s+(?:TOTAL|CONSTRUIDA|COBERTA)(?:\s+CONSTRUIDA)?|A\.?\s*TOTAL|A\.?\s*CONSTR\.?)\b[^0-9]{0,15}${NUM}\s*${UNIT}?`);
const EXCLUDE_RE = /TERRENO|PERMEAVEL|LOTE\b|OCUPACAO|APROVEITAMENTO|RECUO|ESCALA|PROJECAO|DEMOLIR/;
const AREA_LABEL_RE = new RegExp(String.raw`(?:^|[^A-Z])(?:AREA|A)\s*[:=]\s*${NUM}\s*${UNIT}?`);
const AREA_UNIT_RE = new RegExp(String.raw`${NUM}\s*${UNIT}`);

const ROOM_RE = new RegExp(
  String.raw`\b(?:` +
  [
    String.raw`SALA(?:\s+DE)?(?:\s+(?:ESTAR|JANTAR|TV|INTIMA))?`,
    String.raw`(?:ESTAR|JANTAR|LIVING)(?:\s*/\s*(?:ESTAR|JANTAR))?`,
    String.raw`COZINHA(?:\s+GOURMET)?`,
    'COPA',
    String.raw`(?:QUARTO|DORM(?:ITORIO)?\.?|SUITE)(?:\s*(?:\d{1,2}|MASTER|CASAL|HOSPEDES|SOLTEIRO))?`,
    String.raw`BANHEIRO(?:\s+\d)?`,
    String.raw`BWC|WC|LAVABO|BANHO`,
    String.raw`AREA\s+DE\s+SERVICO|A\.?\s*SERV(?:ICO)?\.?|LAVANDERIA`,
    String.raw`GARAGEM|ABRIGO(?:\s+DE\s+VEICULOS)?`,
    String.raw`VARANDA(?:\s+GOURMET)?|SACADA|TERRACO|ALPENDRE`,
    String.raw`CIRCULACAO|CIRC\.|HALL|CORREDOR|ESCADA`,
    String.raw`ESCRITORIO|HOME\s+OFFICE|CLOSET|DESPENSA|DEPOSITO|DEP\.`,
    String.raw`(?:ESPACO\s+)?GOURMET|CHURRASQUEIRA|PISCINA|DECK|JARDIM|QUINTAL`,
  ].join('|') +
  ')',
);

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase();

export function sugerirTipoArea(nome: string): string {
  const n = normalize(nome);
  if (/GARAGEM|ABRIGO/.test(n)) return 'garagem';
  if (/VARANDA|SACADA|ALPENDRE|GOURMET|CHURRASQ/.test(n)) return 'varanda';
  if (/PISCINA/.test(n)) return 'piscina';
  if (/TERRACO|DECK/.test(n)) return 'terracoDescoberto';
  if (/JARDIM|QUINTAL|CALCADA/.test(n)) return 'externo';
  return 'principal';
}

const titleCase = (s: string) =>
  s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());

function buildLines(items: PdfText[]): Line[] {
  const lines: Line[] = [];
  const byPage = new Map<number, PdfText[]>();
  for (const it of items) {
    if (!it.str.trim()) continue;
    const list = byPage.get(it.page) ?? [];
    list.push(it);
    byPage.set(it.page, list);
  }
  for (const [page, list] of byPage) {
    list.sort((a, b) => b.y - a.y || a.x - b.x);
    let cur: { items: PdfText[]; y: number } | null = null;
    const flush = () => {
      if (!cur) return;
      const text = cur.items.map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim();
      const first = cur.items[0];
      const last = cur.items[cur.items.length - 1];
      lines.push({ text, norm: normalize(text), x: (first.x + last.x + last.width) / 2, y: cur.y, page });
    };
    for (const it of list) {
      const prev = cur?.items[cur.items.length - 1];
      const sameLine = cur && Math.abs(it.y - cur.y) < 2.5 && prev && it.x - (prev.x + prev.width) < 12 && it.x >= prev.x;
      if (sameLine) cur!.items.push(it);
      else {
        flush();
        cur = { items: [it], y: it.y };
      }
    }
    flush();
  }
  return lines;
}

/** Heurística: encontra áreas ("A = 12,50 m²", "12,50 m2") e associa ao nome de cômodo mais próximo. */
export function extractFromText(items: PdfText[], paginas: number): PdfExtraction {
  const avisos: string[] = [];
  const lines = buildLines(items);
  let areaTotal: number | null = null;

  type Cand = { line: Line; area: number; nome?: string };
  const areasC: Cand[] = [];
  const nomes: { line: Line; nome: string }[] = [];

  for (const line of lines) {
    const total = line.norm.match(TOTAL_RE);
    if (total) {
      areaTotal ??= parseNum(total[1]);
      continue;
    }
    if (EXCLUDE_RE.test(line.norm)) continue;
    const room = line.norm.match(ROOM_RE);
    const am = line.norm.match(AREA_LABEL_RE) ?? line.norm.match(AREA_UNIT_RE);
    const area = am ? parseNum(am[1]) : 0;
    if (area > 0 && area < 2000) areasC.push({ line, area, nome: room ? titleCase(room[0]) : undefined });
    else if (room) nomes.push({ line, nome: titleCase(room[0]) });
  }

  const rooms: ExtractedRoom[] = [];
  const pendentes: Cand[] = [];
  for (const c of areasC) {
    if (c.nome)
      rooms.push({ nome: c.nome, area: c.area, tipoArea: sugerirTipoArea(c.nome), confianca: 'alta', pagina: c.line.page, trecho: c.line.text });
    else pendentes.push(c);
  }

  // Pareamento guloso por distância; nome acima da área (y maior) é o layout mais comum em plantas.
  const pares: { a: number; n: number; custo: number }[] = [];
  pendentes.forEach((c, a) =>
    nomes.forEach((nm, n) => {
      if (nm.line.page !== c.line.page) return;
      const dx = nm.line.x - c.line.x;
      const dy = nm.line.y - c.line.y;
      const custo = Math.hypot(dx, dy) * (dy < 0 ? 2 : 1);
      if (custo < 150) pares.push({ a, n, custo });
    }),
  );
  pares.sort((p, q) => p.custo - q.custo);
  const usadosA = new Set<number>();
  const usadosN = new Set<number>();
  for (const p of pares) {
    if (usadosA.has(p.a) || usadosN.has(p.n)) continue;
    usadosA.add(p.a);
    usadosN.add(p.n);
    const c = pendentes[p.a];
    const nome = nomes[p.n].nome;
    rooms.push({
      nome,
      area: c.area,
      tipoArea: sugerirTipoArea(nome),
      confianca: p.custo < 40 ? 'media' : 'baixa',
      pagina: c.line.page,
      trecho: `${nomes[p.n].line.text} … ${c.line.text}`,
    });
  }
  pendentes.forEach((c, i) => {
    if (!usadosA.has(i))
      rooms.push({ nome: 'Ambiente não identificado', area: c.area, tipoArea: 'principal', confianca: 'baixa', pagina: c.line.page, trecho: c.line.text });
  });

  // Plantas costumam repetir ambientes (planta baixa + layout): remove duplicatas.
  const vistos = new Set<string>();
  const unicos = rooms.filter((r) => {
    const k = `${normalize(r.nome)}|${r.area}`;
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
  if (unicos.length < rooms.length) avisos.push(`${rooms.length - unicos.length} ambiente(s) duplicado(s) ignorado(s).`);

  const semArea = nomes.length - usadosN.size;
  if (semArea > 0) avisos.push(`${semArea} nome(s) de cômodo encontrados sem área associada.`);
  if (items.length === 0)
    avisos.push('Nenhum texto encontrado: o PDF parece ser digitalizado (imagem). Será necessário OCR ou digitação manual.');

  const soma = unicos.reduce((s, r) => s + r.area, 0);
  if (areaTotal && soma > 0 && Math.abs(soma - areaTotal) / areaTotal > 0.15)
    avisos.push(`A soma das áreas encontradas (${soma.toFixed(2)} m²) difere mais de 15% da área total declarada (${areaTotal.toFixed(2)} m²). Revise.`);

  return { rooms: unicos.sort((a, b) => a.pagina - b.pagina), areaTotal, paginas, avisos };
}
