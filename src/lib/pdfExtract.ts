import { parseNum } from './format';

export interface PdfText {
  str: string;
  x: number;
  y: number;
  width: number;
  page: number;
  /** Direção do texto (transform[0..1] normalizado). Padrão: horizontal. */
  dir?: [number, number];
  /** Tamanho da fonte em pontos. */
  size?: number;
}

export interface ExtractedRoom {
  nome: string;
  area: number;
  tipoArea: string;
  confianca: 'alta' | 'media' | 'baixa';
  pagina: number;
  trecho: string;
  /** Mesmo nome e área em outra página (ex.: planta repetida em layout). */
  duplicata: boolean;
}

export interface PdfExtraction {
  rooms: ExtractedRoom[];
  areaTotal: number | null;
  paginas: number;
  avisos: string[];
}

/** Linha de texto num referencial alinhado à direção do texto: u = ao longo, v = perpendicular (maior = acima). */
interface Line {
  text: string;
  norm: string;
  page: number;
  orient: string;
  u0: number;
  u1: number;
  v: number;
  size: number;
}

const NUM = String.raw`(\d{1,3}(?:\.\d{3})+,\d{1,2}|\d{1,5}(?:[.,]\d{1,2})?)`;
const UNIT = String.raw`(?:M\s?²|M\s?2\b|M\^2)`;
const TOTAL_RE = new RegExp(String.raw`\b(?:AREA\s+(?:TOTAL|CONSTRUIDA|COBERTA)(?:\s+CONSTRUIDA)?|A\.?\s*TOTAL|A\.?\s*CONSTR\.?)\b[^0-9]{0,15}${NUM}\s*${UNIT}?`);
const EXCLUDE_RE = /TERRENO|PERMEAVEL|LOTE\b|OCUPACAO|APROVEITAMENTO|RECUO|ESCALA|DEMOLIR/;
const AREA_LABEL_RE = new RegExp(String.raw`(?:^|[^A-Z])(?:AREA|A)\s*[:=]\s*${NUM}\s*${UNIT}?`);
const AREA_UNIT_RE = new RegExp(String.raw`${NUM}\s*${UNIT}`);
/** Textos que aparecem perto da área mas não são nome de ambiente. */
const NOT_NAME_RE =
  /^(?:PISO|PISOS|LAJE|FORRO|REVEST|NIVEL|NIV\b|COTA|ESC\b|ESCALA|CORTE|VISTA|DET\b|DET\.|PROJ|JANELA|PORTA|[PJ]\d|H\s*=|PD\b|PE\s*DIREITO|LEGENDA|OBS|CAIMENTO|INCLINACAO|TELHA|RUFO|CALHA|PROPRIETARIO|PROJETO|DESENHO|ASSUNTO|DATA|REVIS)/;

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
    String.raw`ACADEMIA|SPA|SAUNA|BRINQUEDOTECA|ADEGA|CINEMA|SALAO\s+DE\s+JOGOS|ATELIE|BIBLIOTECA|ESTUDO`,
    String.raw`AREA\s+(?:EXTERNA|GOURMET|DE\s+LAZER|TECNICA)|RAMPA|ACESSO|ENTRADA|VESTIBULO|ROUPARIA|DESPENSA|LAVANDERIA`,
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
  if (/JARDIM|QUINTAL|CALCADA|RAMPA|ACESSO\s+VEICULAR|AREA\s+EXTERNA/.test(n)) return 'externo';
  return 'principal';
}

const titleCase = (s: string) =>
  s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());

const ANGLE_KEY = (d: [number, number]) => `${Math.round(d[0] * 10)},${Math.round(d[1] * 10)}`;

function buildLines(items: PdfText[]): Line[] {
  // PDFs exportados de CAD costumam repetir cada texto na mesma posição.
  const vistos = new Set<string>();
  const grupos = new Map<string, { str: string; u: number; v: number; w: number; size: number }[]>();
  for (const it of items) {
    if (!it.str.trim()) continue;
    const k = `${it.page}|${it.str}|${Math.round(it.x)}|${Math.round(it.y)}`;
    if (vistos.has(k)) continue;
    vistos.add(k);
    const [dx, dy] = it.dir ?? [1, 0];
    const key = `${it.page}|${ANGLE_KEY([dx, dy])}`;
    const list = grupos.get(key) ?? [];
    list.push({ str: it.str, u: it.x * dx + it.y * dy, v: -it.x * dy + it.y * dx, w: it.width, size: it.size ?? 10 });
    grupos.set(key, list);
  }

  const lines: Line[] = [];
  for (const [key, list] of grupos) {
    const [page, orient] = key.split('|');
    list.sort((a, b) => b.v - a.v);
    // 1) agrupa em faixas de mesma altura; 2) dentro da faixa, quebra por lacunas grandes.
    const faixas: (typeof list)[] = [];
    for (const it of list) {
      const f = faixas[faixas.length - 1];
      if (f && Math.abs(f[0].v - it.v) < Math.max(1, it.size * 0.4)) f.push(it);
      else faixas.push([it]);
    }
    for (const f of faixas) {
      f.sort((a, b) => a.u - b.u);
      let cur: typeof f = [];
      const flush = () => {
        if (!cur.length) return;
        const text = cur.map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim();
        const last = cur[cur.length - 1];
        lines.push({
          text,
          norm: normalize(text),
          page: Number(page),
          orient,
          u0: cur[0].u,
          u1: last.u + last.w,
          v: cur[0].v,
          size: Math.max(...cur.map((i) => i.size)),
        });
        cur = [];
      };
      for (const it of f) {
        const prev = cur[cur.length - 1];
        if (prev && it.u - (prev.u + prev.w) > Math.max(prev.size, it.size) * 1.5) flush();
        cur.push(it);
      }
      flush();
    }
  }
  return lines;
}

function isNameLike(norm: string) {
  const letras = norm.match(/[A-Z]/g)?.length ?? 0;
  const digitos = norm.match(/\d/g)?.length ?? 0;
  return /^[A-Z]/.test(norm) && letras >= 3 && digitos <= 3 && !NOT_NAME_RE.test(norm) && !AREA_UNIT_RE.test(norm);
}

const overlap = (a: Line, b: Line, tol: number) => a.u0 - tol <= b.u1 && a.u1 + tol >= b.u0;

/**
 * Heurística: encontra áreas ("A: 12,50 m²", "12,50m2") e usa como nome do ambiente
 * o texto imediatamente acima (no sentido de leitura, inclusive texto rotacionado).
 */
export function extractFromText(items: PdfText[], paginas: number): PdfExtraction {
  const avisos: string[] = [];
  const lines = buildLines(items);
  let areaTotal: number | null = null;

  type Cand = { line: Line; area: number; nome?: string };
  const areasC: Cand[] = [];
  const nomes: Line[] = [];

  for (const line of lines) {
    const total = line.norm.match(TOTAL_RE);
    if (total) {
      areaTotal ??= parseNum(total[1]);
      continue;
    }
    if (EXCLUDE_RE.test(line.norm)) continue;
    const am = line.norm.match(AREA_LABEL_RE) ?? line.norm.match(AREA_UNIT_RE);
    const area = am ? parseNum(am[1]) : 0;
    if (am && area > 0 && area < 2000) {
      // Nome na mesma linha, antes da área (ex.: "SALA A=12,50m²").
      const prefixo = line.norm.slice(0, am.index).replace(/[^A-Z0-9.\s/-]/g, ' ').trim();
      const nome = isNameLike(prefixo) ? line.text.slice(0, prefixo.length).trim() : undefined;
      areasC.push({ line, area, nome });
    } else if (isNameLike(line.norm)) nomes.push(line);
  }

  const rooms: ExtractedRoom[] = [];
  const pendentes: Cand[] = [];
  for (const c of areasC) {
    if (c.nome)
      rooms.push({ nome: titleCase(c.nome), area: c.area, tipoArea: sugerirTipoArea(c.nome), confianca: 'alta', pagina: c.line.page, trecho: c.line.text, duplicata: false });
    else pendentes.push(c);
  }

  // Pareamento guloso: nome logo acima da área, sobrepondo horizontalmente.
  const pares: { a: number; n: number; custo: number; dv: number }[] = [];
  pendentes.forEach((c, a) =>
    nomes.forEach((nm, n) => {
      const A = c.line;
      if (nm.page !== A.page || nm.orient !== A.orient) return;
      const dv = nm.v - A.v;
      if (dv <= 0 || dv > Math.max(A.size, nm.size) * 3.5) return;
      if (!overlap(nm, A, A.size * 2)) return;
      const du = Math.abs((nm.u0 + nm.u1) / 2 - (A.u0 + A.u1) / 2);
      pares.push({ a, n, dv, custo: dv + du * 0.3 });
    }),
  );
  pares.sort((p, q) => p.custo - q.custo);
  const atribuido = new Map<number, { n: number; dv: number }>();
  const usadosN = new Set<number>();
  for (const p of pares) {
    if (atribuido.has(p.a) || usadosN.has(p.n)) continue;
    atribuido.set(p.a, { n: p.n, dv: p.dv });
    usadosN.add(p.n);
  }
  pendentes.forEach((c, a) => {
    const par = atribuido.get(a);
    if (!par) {
      rooms.push({ nome: 'Ambiente não identificado', area: c.area, tipoArea: 'principal', confianca: 'baixa', pagina: c.line.page, trecho: c.line.text, duplicata: false });
      return;
    }
    const base = nomes[par.n];
    let nome = base.text;
    // Nomes em duas linhas (ex.: "RAMPA" / "DE ACESSO VEICULAR").
    const acima = nomes.findIndex(
      (m, i) =>
        !usadosN.has(i) &&
        m.page === base.page &&
        m.orient === base.orient &&
        m.v - base.v > 0 &&
        m.v - base.v <= base.size * 1.8 &&
        overlap(m, base, base.size),
    );
    if (acima >= 0) {
      usadosN.add(acima);
      nome = `${nomes[acima].text} ${nome}`;
    }
    const adjacente = par.dv <= Math.max(c.line.size, base.size) * 2.2;
    const conhecido = ROOM_RE.test(normalize(nome));
    rooms.push({
      nome: titleCase(nome),
      area: c.area,
      tipoArea: sugerirTipoArea(nome),
      confianca: adjacente ? (conhecido ? 'alta' : 'media') : 'baixa',
      pagina: c.line.page,
      trecho: `${nome} … ${c.line.text}`,
      duplicata: false,
    });
  });

  // Mesmo ambiente desenhado em mais de uma página (planta + layout): marca como possível duplicata.
  const primeiraPagina = new Map<string, number>();
  rooms.sort((a, b) => a.pagina - b.pagina);
  for (const r of rooms) {
    const k = `${normalize(r.nome)}|${r.area}`;
    const pg = primeiraPagina.get(k);
    if (pg === undefined) primeiraPagina.set(k, r.pagina);
    else if (pg !== r.pagina) r.duplicata = true;
  }
  const dups = rooms.filter((r) => r.duplicata).length;
  if (dups > 0) avisos.push(`${dups} ambiente(s) repetido(s) em outra página foram desmarcados. Confira se não são de outro pavimento.`);

  const semArea = nomes.filter((n, i) => !usadosN.has(i) && ROOM_RE.test(n.norm)).length;
  if (semArea > 0) avisos.push(`${semArea} nome(s) de cômodo sem área próxima (cortes, fachadas ou legendas) foram ignorados.`);
  if (items.length === 0)
    avisos.push('Nenhum texto encontrado: o PDF parece ser digitalizado (imagem). Será necessário OCR ou digitação manual.');

  const soma = rooms.filter((r) => !r.duplicata).reduce((s, r) => s + r.area, 0);
  if (areaTotal && soma > 0 && Math.abs(soma - areaTotal) / areaTotal > 0.15)
    avisos.push(`A soma das áreas encontradas (${soma.toFixed(2)} m²) difere mais de 15% da área total declarada (${areaTotal.toFixed(2)} m²). Revise.`);

  return { rooms, areaTotal, paginas, avisos };
}
