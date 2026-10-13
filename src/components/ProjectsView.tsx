import { useState } from 'react';
import { useStore } from '../store/useStore';
import { calcBudget } from '../lib/calc';
import { fmtBRL, fmtM2 } from '../lib/format';
import { PADRAO_LABEL } from '../data/referencias';
import { Card, Empty } from './ui';

export function ProjectsView({ onOpen }: { onOpen: () => void }) {
  const { projects, cub, stages, areaTipos, activeProjectId, createProject, createDemoProject, setActive, deleteProject, duplicateProject } =
    useStore();
  const [nome, setNome] = useState('');

  const criar = () => {
    createProject(nome.trim() || `Minha casa ${projects.length + 1}`);
    setNome('');
    onOpen();
  };

  return (
    <Card title="Projetos">
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          criar();
        }}
      >
        <input placeholder="Nome do projeto (ex.: Casa Jardim Europa)" value={nome} onChange={(e) => setNome(e.target.value)} />
        <button type="submit">Novo projeto</button>
      </form>

      {projects.length === 0 ? (
        <Empty>
          Nenhum projeto ainda. Crie um para começar o orçamento ou{' '}
          <button
            className="btn-link"
            onClick={() => {
              createDemoProject();
              onOpen();
            }}
          >
            carregue um projeto de exemplo <span className="arrow">›</span>
          </button>
        </Empty>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Projeto</th>
              <th>Padrão</th>
              <th className="num">Área</th>
              <th className="num">Estimativa</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => {
              const b = calcBudget(p, cub, stages, areaTipos);
              return (
                <tr key={p.id} className={p.id === activeProjectId ? 'active' : ''}>
                  <td>
                    <strong>{p.nome}</strong>
                    <br />
                    <small>{p.cidade}</small>
                  </td>
                  <td>{PADRAO_LABEL[p.padrao]}</td>
                  <td className="num">{fmtM2(b.areaReal)}</td>
                  <td className="num">{fmtBRL(b.total)}</td>
                  <td className="actions">
                    <button
                      onClick={() => {
                        setActive(p.id);
                        onOpen();
                      }}
                    >
                      Abrir
                    </button>
                    <button className="secondary" onClick={() => duplicateProject(p.id)}>
                      Duplicar
                    </button>
                    <button
                      className="danger"
                      onClick={() => window.confirm(`Excluir "${p.nome}"?`) && deleteProject(p.id)}
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Card>
  );
}
