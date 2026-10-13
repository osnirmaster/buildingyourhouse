export type Padrao = 'baixo' | 'normal' | 'alto';
export type TipoProjeto = 'R1' | 'R8' | 'R16';
export type Regime = 'naoDesonerado' | 'desonerado';
export type Contratacao = 'empreitada' | 'administracao' | 'autoconstrucao';

export interface AreaTipo {
  id: string;
  nome: string;
  /** Coeficiente de equivalência de área (NBR 12721). */
  coeficiente: number;
  faixa: string;
}

export interface Room {
  id: string;
  nome: string;
  area: number;
  tipoArea: string;
  origem: 'manual' | 'pdf';
}

export interface Adicional {
  id: string;
  nome: string;
  /** Percentual sobre o custo direto da obra, ou só sobre a mão de obra (base = 'maoDeObra'). */
  percentual: number;
  base?: 'custo' | 'maoDeObra';
  ativo: boolean;
  descricao: string;
}

export interface Expense {
  id: string;
  data: string;
  etapaId: string;
  descricao: string;
  valor: number;
}

export interface Project {
  id: string;
  nome: string;
  cidade: string;
  tipo: TipoProjeto;
  padrao: Padrao;
  regime: Regime;
  contratacao: Contratacao;
  /** Autoconstrução: custo da mão de obra contratada diretamente em relação ao CUB (%). */
  ajusteMaoDeObra: number;
  duracaoMeses: number;
  areaTotalDeclarada?: number;
  observacoes: string;
  rooms: Room[];
  adicionais: Adicional[];
  expenses: Expense[];
  criadoEm: string;
  atualizadoEm: string;
}

export interface CubTable {
  referencia: string;
  fonte: string;
  valores: Record<Regime, Record<TipoProjeto, Partial<Record<Padrao, number>>>>;
}

export interface Stage {
  id: string;
  nome: string;
  /** Peso da etapa no custo base (%). */
  percentual: number;
  /** Parcela de mão de obra dentro da etapa (%); o restante é material. */
  maoDeObra: number;
  /** Janela da etapa no cronograma, como fração da duração (0–1). */
  inicio: number;
  fim: number;
}

export interface AppData {
  projects: Project[];
  cub: CubTable;
  stages: Stage[];
  areaTipos: AreaTipo[];
}
