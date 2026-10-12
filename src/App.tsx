import { useState } from 'react';
import { Header } from './components/Header';
import { ProjectsView } from './components/ProjectsView';
import { ProjectView } from './components/ProjectView';
import { PdfImportView } from './components/PdfImportView';
import { BudgetView } from './components/BudgetView';
import { ScheduleView } from './components/ScheduleView';
import { ExpensesView } from './components/ExpensesView';
import { TablesView } from './components/TablesView';
import { useActiveProject } from './store/useStore';

const TABS = [
  { id: 'projetos', label: 'Projetos' },
  { id: 'dados', label: 'Dados e cômodos' },
  { id: 'pdf', label: 'Importar planta PDF' },
  { id: 'orcamento', label: 'Orçamento' },
  { id: 'cronograma', label: 'Cronograma' },
  { id: 'gastos', label: 'Gastos' },
  { id: 'tabelas', label: 'Tabelas' },
] as const;
type Tab = (typeof TABS)[number]['id'];

export default function App() {
  const [tab, setTab] = useState<Tab>('projetos');
  const project = useActiveProject();

  return (
    <div className="app">
      <Header />
      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'tab active' : 'tab'} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
        {project && <span className="current">Projeto: {project.nome}</span>}
      </nav>
      <main>
        {tab === 'projetos' && <ProjectsView onOpen={() => setTab('dados')} />}
        {tab === 'dados' && <ProjectView />}
        {tab === 'pdf' && <PdfImportView onDone={() => setTab('dados')} />}
        {tab === 'orcamento' && <BudgetView />}
        {tab === 'cronograma' && <ScheduleView />}
        {tab === 'gastos' && <ExpensesView />}
        {tab === 'tabelas' && <TablesView />}
      </main>
      <footer>
        Dados salvos apenas neste navegador (localStorage). Exporte backups com frequência. Valores estimados — não
        substituem orçamento profissional.
      </footer>
    </div>
  );
}
