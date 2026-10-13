import { useState } from 'react';
import { Header } from './components/Header';
import { ProjectsView } from './components/ProjectsView';
import { ProjectView } from './components/ProjectView';
import { PdfImportView } from './components/PdfImportView';
import { BudgetView } from './components/BudgetView';
import { ScheduleView } from './components/ScheduleView';
import { ExpensesView } from './components/ExpensesView';
import { TablesView } from './components/TablesView';

const TABS = [
  { id: 'projetos', label: 'Projetos' },
  { id: 'dados', label: 'Cômodos' },
  { id: 'pdf', label: 'Planta PDF' },
  { id: 'orcamento', label: 'Orçamento' },
  { id: 'cronograma', label: 'Cronograma' },
  { id: 'gastos', label: 'Gastos' },
  { id: 'tabelas', label: 'Tabelas' },
] as const;
type Tab = (typeof TABS)[number]['id'];

const HERO: Record<Tab, { eyebrow: string; title: string; text: string }> = {
  projetos: {
    eyebrow: 'Orçamento de obras · CUB Sinduscon-SP',
    title: 'Planeje o custo da sua casa com as tabelas oficiais',
    text: 'Estime, compare padrões de acabamento, acompanhe o cronograma e controle cada gasto da obra — tudo no seu navegador.',
  },
  dados: {
    eyebrow: 'Projeto',
    title: 'Dados e cômodos',
    text: 'Defina tipo, padrão e regime, e cadastre os ambientes com as áreas equivalentes da NBR 12721.',
  },
  pdf: {
    eyebrow: 'Automação',
    title: 'Importe a planta em PDF',
    text: 'Encontramos áreas e nomes dos cômodos direto no desenho. Você revisa antes de salvar.',
  },
  orcamento: {
    eyebrow: 'Análise de custo',
    title: 'Orçamento por etapa',
    text: 'Custo base pelo CUB, itens que o CUB não cobre e comparativo entre padrões.',
  },
  cronograma: {
    eyebrow: 'Planejamento',
    title: 'Cronograma físico-financeiro',
    text: 'Quanto você vai desembolsar em cada mês da obra.',
  },
  gastos: {
    eyebrow: 'Controle',
    title: 'Orçado × realizado',
    text: 'Lance os gastos reais e veja onde a obra está acima do previsto.',
  },
  tabelas: {
    eyebrow: 'Referências',
    title: 'Tabelas oficiais',
    text: 'CUB/m², pesos das etapas e coeficientes de área. Atualize mensalmente.',
  },
};

export default function App() {
  const [tab, setTab] = useState<Tab>('projetos');
  const hero = HERO[tab];
  const big = tab === 'projetos';

  return (
    <div className="app">
      <Header tabs={TABS} tab={tab} onTab={setTab} />
      <section className={big ? 'hero hero-lg' : 'hero'}>
        <div className="hero-gradient" aria-hidden />
        <div className="container hero-content">
          <p className="eyebrow">{hero.eyebrow}</p>
          <h1>{hero.title}</h1>
          <p className="lead">{hero.text}</p>
          {big && (
            <div className="hero-ctas">
              <button className="btn-pill dark" onClick={() => setTab('pdf')}>
                Importar planta <span className="arrow">›</span>
              </button>
              <button className="btn-link" onClick={() => setTab('tabelas')}>
                Ver tabelas oficiais <span className="arrow">›</span>
              </button>
            </div>
          )}
        </div>
      </section>
      <main className="container content">
        {tab === 'projetos' && <ProjectsView onOpen={() => setTab('dados')} />}
        {tab === 'dados' && <ProjectView />}
        {tab === 'pdf' && <PdfImportView onDone={() => setTab('dados')} />}
        {tab === 'orcamento' && <BudgetView />}
        {tab === 'cronograma' && <ScheduleView />}
        {tab === 'gastos' && <ExpensesView />}
        {tab === 'tabelas' && <TablesView />}
      </main>
      <footer className="footer">
        <div className="container">
          Dados salvos apenas neste navegador (localStorage). Exporte backups com frequência. Valores estimados — não
          substituem orçamento profissional.
        </div>
      </footer>
    </div>
  );
}
