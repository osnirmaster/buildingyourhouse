import { useState } from 'react';
import { useActiveProject, useStore } from '../store/useStore';
import { areas, cubValor } from '../lib/calc';
import { fmtBRL, fmtM2 } from '../lib/format';
import { sugerirTipoArea } from '../lib/pdfExtract';
import { CONTRATACAO_INFO, PADRAO_LABEL, TIPO_LABEL, aplicarContratacao } from '../data/referencias';
import type { Contratacao, Padrao, Regime, TipoProjeto } from '../types';
import { Card, Empty, NumInput } from './ui';

export function ProjectView() {
  const project = useActiveProject();
  const { cub, areaTipos, updateProject, addRooms, updateRoom, removeRoom } = useStore();
  const [novo, setNovo] = useState({ nome: '', area: 0 });

  if (!project) return <Empty>Selecione ou crie um projeto na aba Projetos.</Empty>;
  const set = (patch: Parameters<typeof updateProject>[1]) => updateProject(project.id, patch);
  const { real, equivalente } = areas(project, areaTipos);
  const cubM2 = cubValor(cub, project);

  const adicionar = () => {
    if (!novo.nome.trim() || novo.area <= 0) return;
    addRooms(project.id, [{ nome: novo.nome.trim(), area: novo.area, tipoArea: sugerirTipoArea(novo.nome), origem: 'manual' }]);
    setNovo({ nome: '', area: 0 });
  };

  return (
    <>
      <Card title="Dados do projeto">
        <div className="grid">
          <label>
            Nome
            <input value={project.nome} onChange={(e) => set({ nome: e.target.value })} />
          </label>
          <label>
            Cidade (SP)
            <input value={project.cidade} onChange={(e) => set({ cidade: e.target.value })} />
          </label>
          <label>
            Tipo de edificação
            <select value={project.tipo} onChange={(e) => set({ tipo: e.target.value as TipoProjeto })}>
              {Object.entries(TIPO_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            Padrão de acabamento
            <select value={project.padrao} onChange={(e) => set({ padrao: e.target.value as Padrao })}>
              {Object.entries(PADRAO_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            Forma de contratação
            <select
              value={project.contratacao}
              onChange={(e) => {
                const c = e.target.value as Contratacao;
                set({ contratacao: c, adicionais: aplicarContratacao(project.adicionais, c) });
              }}
            >
              {Object.entries(CONTRATACAO_INFO).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.nome}
                </option>
              ))}
            </select>
          </label>
          {project.contratacao === 'autoconstrucao' && (
            <label title="Pedreiros e empreiteiros contratados direto costumam custar menos que a mão de obra registrada considerada no CUB.">
              Custo da mão de obra direta (% do CUB)
              <NumInput step={5} min={0} value={project.ajusteMaoDeObra} onChange={(v) => set({ ajusteMaoDeObra: v })} />
            </label>
          )}
          <label>
            Tabela CUB (encargos)
            <select value={project.regime} onChange={(e) => set({ regime: e.target.value as Regime })}>
              <option value="naoDesonerado">Não desonerado (pessoa física / padrão)</option>
              <option value="desonerado">Desonerado (construtora com folha desonerada)</option>
            </select>
          </label>
          <label>
            Duração prevista (meses)
            <NumInput step={1} min={1} value={project.duracaoMeses} onChange={(v) => set({ duracaoMeses: Math.max(1, v) })} />
          </label>
        </div>
        <p className="hint">
          <strong>{CONTRATACAO_INFO[project.contratacao].nome}:</strong> {CONTRATACAO_INFO[project.contratacao].descricao} Os itens
          de BDI/administração e INSS da obra são ajustados no Orçamento.
        </p>
        <p className="hint">
          CUB aplicado:{' '}
          {cubM2 === null ? (
            <strong className="error">não publicado para essa combinação — escolha outro padrão/tipo/regime</strong>
          ) : (
            <strong>{fmtBRL(cubM2)}/m²</strong>
          )}{' '}
          · referência {cub.referencia}
        </p>
        <label>
          Observações
          <textarea rows={2} value={project.observacoes} onChange={(e) => set({ observacoes: e.target.value })} />
        </label>
      </Card>

      <Card title="Ambientes / cômodos">
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            adicionar();
          }}
        >
          <input placeholder="Cômodo (ex.: Suíte 1)" value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
          <NumInput aria-label="Área m²" value={novo.area} onChange={(v) => setNovo({ ...novo, area: v })} />
          <button type="submit">Adicionar</button>
        </form>

        {project.rooms.length === 0 ? (
          <Empty>Adicione os cômodos manualmente ou importe da planta em PDF.</Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Cômodo</th>
                <th className="num">Área (m²)</th>
                <th>Tipo de área (coef. NBR 12721)</th>
                <th>Origem</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {project.rooms.map((r) => (
                <tr key={r.id}>
                  <td>
                    <input className="room-name" value={r.nome} onChange={(e) => updateRoom(project.id, r.id, { nome: e.target.value })} />
                  </td>
                  <td className="num">
                    <NumInput value={r.area} onChange={(v) => updateRoom(project.id, r.id, { area: v })} />
                  </td>
                  <td>
                    <select value={r.tipoArea} onChange={(e) => updateRoom(project.id, r.id, { tipoArea: e.target.value })}>
                      {areaTipos.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nome} ({t.coeficiente})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span className="tag">{r.origem === 'pdf' ? 'PDF' : 'manual'}</span>
                  </td>
                  <td>
                    <button className="danger small" onClick={() => removeRoom(project.id, r.id)} aria-label="Remover">
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td className="num">{fmtM2(real)}</td>
                <td colSpan={3}>Área equivalente: {fmtM2(equivalente)}</td>
              </tr>
            </tfoot>
          </table>
        )}
        {project.areaTotalDeclarada ? (
          <p className="hint">
            Área total declarada na planta: {fmtM2(project.areaTotalDeclarada)}
            {Math.abs(real - project.areaTotalDeclarada) > 0.5 && ` (diferença de ${fmtM2(real - project.areaTotalDeclarada)})`}
          </p>
        ) : null}
      </Card>
    </>
  );
}
