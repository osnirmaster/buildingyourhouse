import type { Adicional, AreaTipo, Contratacao, CubTable, Padrao, Stage, TipoProjeto } from '../types';

/**
 * CUB/m² — Sinduscon-SP, Estado de São Paulo, referência agosto/2026 (NBR 12721:2006).
 * Atualize mensalmente na aba "Tabelas" com os valores publicados pelo Sinduscon-SP.
 */
export const CUB_SP_PADRAO: CubTable = {
  referencia: '2026-08',
  fonte: 'Sinduscon-SP — Custo Unitário Básico (CUB/m²), Estado de São Paulo, agosto/2026',
  valores: {
    naoDesonerado: {
      R1: { baixo: 2190.76, normal: 2686.65, alto: 3249.37 },
      R8: { baixo: 1949.12, normal: 2235.58, alto: 2623.21 },
      R16: { normal: 2172.57, alto: 2841.55 },
    },
    desonerado: {
      R1: { baixo: 2123.23, normal: 2591.41, alto: 3146.01 },
      R8: {},
      R16: {},
    },
  },
};

export const PADRAO_LABEL: Record<Padrao, string> = {
  baixo: 'Baixo padrão',
  normal: 'Médio padrão (normal)',
  alto: 'Alto padrão',
};

export const TIPO_LABEL: Record<TipoProjeto, string> = {
  R1: 'R-1 — Residência unifamiliar (casa)',
  R8: 'R-8 — Residência multifamiliar (8 pav.)',
  R16: 'R-16 — Residência multifamiliar (16 pav.)',
};

/** Coeficientes de equivalência de área — NBR 12721 (valores médios das faixas). */
export const AREA_TIPOS_PADRAO: AreaTipo[] = [
  { id: 'principal', nome: 'Área coberta (ambientes internos)', coeficiente: 1.0, faixa: '1,00' },
  { id: 'garagem', nome: 'Garagem coberta', coeficiente: 0.75, faixa: '0,50 – 0,75' },
  { id: 'varanda', nome: 'Varanda / terraço coberto', coeficiente: 0.75, faixa: '0,75 – 1,00' },
  { id: 'servicoDescoberto', nome: 'Área de serviço descoberta', coeficiente: 0.5, faixa: '0,50' },
  { id: 'terracoDescoberto', nome: 'Terraço / área descoberta', coeficiente: 0.4, faixa: '0,30 – 0,60' },
  { id: 'piscina', nome: 'Piscina', coeficiente: 0.5, faixa: '0,50 – 0,75' },
  { id: 'externo', nome: 'Quintal, calçada, jardim', coeficiente: 0.15, faixa: '0,10 – 0,30' },
];

/**
 * Distribuição típica do custo de uma residência unifamiliar por etapa, a parcela de mão de obra
 * de cada etapa (estimativa de mercado; média ponderada ≈ 52%, em linha com a composição do CUB-SP)
 * e sua janela no cronograma (fração da duração total). Editável na aba "Tabelas".
 */
export const ETAPAS_PADRAO: Stage[] = [
  { id: 'preliminares', nome: 'Serviços preliminares e canteiro', percentual: 3, maoDeObra: 60, inicio: 0, fim: 0.1 },
  { id: 'estrutura', nome: 'Estrutura (pilares, vigas, lajes)', percentual: 16, maoDeObra: 55, inicio: 0.05, fim: 0.4 },
  { id: 'alvenaria', nome: 'Alvenaria e vedações', percentual: 9, maoDeObra: 65, inicio: 0.15, fim: 0.45 },
  { id: 'cobertura', nome: 'Cobertura e telhado', percentual: 8, maoDeObra: 45, inicio: 0.35, fim: 0.55 },
  { id: 'impermeabilizacao', nome: 'Impermeabilização', percentual: 2, maoDeObra: 45, inicio: 0.1, fim: 0.55 },
  { id: 'eletrica', nome: 'Instalações elétricas', percentual: 7, maoDeObra: 55, inicio: 0.25, fim: 0.85 },
  { id: 'hidraulica', nome: 'Instalações hidrossanitárias', percentual: 8, maoDeObra: 50, inicio: 0.2, fim: 0.85 },
  { id: 'esquadrias', nome: 'Esquadrias (portas e janelas)', percentual: 9, maoDeObra: 20, inicio: 0.55, fim: 0.9 },
  { id: 'revestimentos', nome: 'Revestimentos (reboco, cerâmica)', percentual: 12, maoDeObra: 70, inicio: 0.45, fim: 0.8 },
  { id: 'pisos', nome: 'Pisos e rodapés', percentual: 9, maoDeObra: 50, inicio: 0.6, fim: 0.9 },
  { id: 'forros', nome: 'Forros', percentual: 3, maoDeObra: 50, inicio: 0.6, fim: 0.85 },
  { id: 'pintura', nome: 'Pintura', percentual: 6, maoDeObra: 70, inicio: 0.75, fim: 1 },
  { id: 'loucas', nome: 'Louças, metais e acessórios', percentual: 5, maoDeObra: 15, inicio: 0.85, fim: 1 },
  { id: 'limpeza', nome: 'Limpeza e serviços complementares', percentual: 3, maoDeObra: 85, inicio: 0.9, fim: 1 },
];

/**
 * O CUB não inclui estes itens (NBR 12721, item 8.3.5). Percentuais de referência sobre o custo base.
 */
export const ADICIONAIS_PADRAO: Adicional[] = [
  { id: 'fundacoes', nome: 'Fundações', percentual: 6, ativo: true, descricao: 'Varia com o solo; confirme com sondagem.' },
  { id: 'projetos', nome: 'Projetos e aprovações', percentual: 5, ativo: true, descricao: 'Arquitetônico, estrutural, instalações, prefeitura.' },
  { id: 'taxas', nome: 'Taxas, alvará, ART/RRT, habite-se', percentual: 1.5, ativo: true, descricao: 'Inclui ISS quando aplicável.' },
  { id: 'administracao', nome: 'BDI da construtora (empreitada global)', percentual: 20, ativo: true, descricao: 'Lucro, administração central e impostos da construtora.' },
  { id: 'inssObra', nome: 'INSS da obra (mão de obra direta)', percentual: 20, base: 'maoDeObra', ativo: false, descricao: 'Estimativa sobre a mão de obra; o valor oficial é calculado no SERO (Receita Federal).' },
  { id: 'paisagismo', nome: 'Muros, paisagismo e áreas externas', percentual: 4, ativo: false, descricao: 'Itens fora da edificação principal.' },
  { id: 'contingencia', nome: 'Reserva de contingência', percentual: 5, ativo: true, descricao: 'Margem para imprevistos e variação de preços.' },
];

export const SOURCES = [
  { nome: 'Sinduscon-SP — CUB/m²', url: 'https://sindusconsp.com.br/cub/' },
  { nome: 'SINAPI (Caixa) — preços e composições', url: 'https://www.caixa.gov.br/poder-publico/modernizacao-gestao/sinapi/' },
];

export const CONTRATACAO_INFO: Record<Contratacao, { nome: string; descricao: string }> = {
  empreitada: {
    nome: 'Empreitada global (preço fechado)',
    descricao: 'A construtora entrega a obra pronta. Inclui BDI: lucro, administração central e impostos da construtora.',
  },
  administracao: {
    nome: 'Construtora por administração',
    descricao: 'Você paga os custos reais da obra e a construtora cobra uma taxa de administração sobre eles.',
  },
  autoconstrucao: {
    nome: 'Autoconstrução (mão de obra direta)',
    descricao: 'Você compra os materiais e contrata pedreiros e empreiteiros diretamente. Sem BDI, mas com INSS da obra e a gestão por sua conta.',
  },
};

/** Ajustes aplicados aos itens fora do CUB quando a forma de contratação muda. */
export function aplicarContratacao(adicionais: Adicional[], c: Contratacao): Adicional[] {
  return adicionais.map((a) => {
    if (a.id === 'administracao') {
      if (c === 'empreitada') return { ...a, nome: 'BDI da construtora (empreitada global)', percentual: 20, ativo: true, descricao: 'Lucro, administração central e impostos da construtora.' };
      if (c === 'administracao') return { ...a, nome: 'Taxa de administração da construtora', percentual: 12, ativo: true, descricao: 'Cobrada sobre o custo real da obra.' };
      return { ...a, ativo: false };
    }
    if (a.id === 'inssObra') return { ...a, ativo: c === 'autoconstrucao' };
    return a;
  });
}
