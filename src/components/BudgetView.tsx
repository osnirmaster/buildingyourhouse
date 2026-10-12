import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useActiveProject, useStore } from '../store/useStore';
import { calcBudget, compararPadroes } from '../lib/calc';
import { fmtBRL, fmtBRLCompact, fmtM2, fmtPct } from '../lib/format';
import { PADRAO_LABEL } from '../data/referencias';
import { Card, Empty, NumInput, Stat } from './ui';
import { INK, SERIES, axisProps } from './charts';

export function BudgetView() {
  const project = useActiveProject();
  const { cub, stages, areaTipos, updateProject } = useStore();
  if (!project) return <Empty>Selecione ou crie um projeto na aba Projetos.</Empty>;
  if (project.rooms.length === 0) return <Empty>Cadastre os cômodos do projeto para calcular o orçamento.</Empty>;

  const b = calcBudget(project, cub, stages, areaTipos);
  const comparativo = compararPadroes(project, cub, stages, areaTipos);
  const etapasOrdenadas = [...b.etapas].sort((x, y) => y.valor - x.valor);

  const setAdicional = (id: string, patch: { ativo?: boolean; percentual?: number }) =>
    updateProject(project.id, { adicionais: project.adicionais.map((a) => (a.id === id ? { ...a, ...patch } : a)) });

  return (
    <>
      {b.cubM2 === null && (
        <p className="badge warn">⚠ CUB não publicado para esta combinação de tipo/padrão/regime. Ajuste em Dados.</p>
      )}
      <div className="stats">
        <Stat label="Custo total estimado" value={fmtBRL(b.total)} hint={PADRAO_LABEL[project.padrao]} />
        <Stat label="Custo por m² (área real)" value={fmtBRL(b.custoM2Real)} hint={`CUB ${b.cubM2 ? fmtBRL(b.cubM2) : '—'}/m²`} />
        <Stat label="Área real" value={fmtM2(b.areaReal)} hint={`Equivalente: ${fmtM2(b.areaEquivalente)}`} />
        <Stat label="Custo base (CUB × área eq.)" value={fmtBRL(b.custoBase)} hint={`+ ${fmtBRL(b.totalAdicionais)} fora do CUB`} />
      </div>

      <div className="two-col">
        <Card title="Custo por etapa da obra">
          <ResponsiveContainer width="100%" height={420}>
            <BarChart data={etapasOrdenadas} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid horizontal={false} stroke={INK.grid} />
              <XAxis type="number" tickFormatter={fmtBRLCompact} {...axisProps} />
              <YAxis type="category" dataKey="nome" width={190} {...axisProps} />
              <Tooltip formatter={(v) => fmtBRL(Number(v))} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
              <Bar dataKey="valor" name="Valor" fill={SERIES[0]} radius={[0, 4, 4, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Comparativo por padrão de acabamento">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={comparativo.map((c) => ({ ...c, nome: PADRAO_LABEL[c.padrao] }))} margin={{ right: 16 }}>
              <CartesianGrid vertical={false} stroke={INK.grid} />
              <XAxis dataKey="nome" {...axisProps} />
              <YAxis tickFormatter={fmtBRLCompact} width={80} {...axisProps} />
              <Tooltip formatter={(v) => fmtBRL(Number(v))} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
              <Bar dataKey="total" name="Total" fill={SERIES[0]} radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
          <table>
            <tbody>
              {comparativo.map((c) => (
                <tr key={c.padrao} className={c.padrao === project.padrao ? 'active' : ''}>
                  <td>{PADRAO_LABEL[c.padrao]}</td>
                  <td className="num">{c.cubM2 ? `${fmtBRL(c.cubM2)}/m²` : '—'}</td>
                  <td className="num">{c.total !== null ? fmtBRL(c.total) : 'não publicado'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Card title="Itens não incluídos no CUB (NBR 12721)">
        <p className="hint">Percentuais sobre o custo base. Ajuste conforme seu caso.</p>
        <table>
          <thead>
            <tr>
              <th>Incluir</th>
              <th>Item</th>
              <th className="num">%</th>
              <th className="num">Valor</th>
            </tr>
          </thead>
          <tbody>
            {project.adicionais.map((a) => (
              <tr key={a.id}>
                <td>
                  <input type="checkbox" checked={a.ativo} onChange={(e) => setAdicional(a.id, { ativo: e.target.checked })} />
                </td>
                <td>
                  {a.nome}
                  <br />
                  <small>{a.descricao}</small>
                </td>
                <td className="num">
                  <NumInput step={0.5} value={a.percentual} onChange={(v) => setAdicional(a.id, { percentual: v })} />
                </td>
                <td className="num">{a.ativo ? fmtBRL((b.custoBase * a.percentual) / 100) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title="Orçamento detalhado">
        <table>
          <thead>
            <tr>
              <th>Etapa</th>
              <th className="num">% do custo base</th>
              <th className="num">Valor</th>
              <th className="num">R$/m²</th>
            </tr>
          </thead>
          <tbody>
            {b.etapas.map((e) => (
              <tr key={e.id}>
                <td>{e.nome}</td>
                <td className="num">{fmtPct(e.percentual)}</td>
                <td className="num">{fmtBRL(e.valor)}</td>
                <td className="num">{b.areaReal ? fmtBRL(e.valor / b.areaReal) : '—'}</td>
              </tr>
            ))}
            {b.adicionais.map((a) => (
              <tr key={a.id} className="muted-row">
                <td>{a.nome} (fora do CUB)</td>
                <td className="num">{fmtPct(a.percentual)}</td>
                <td className="num">{fmtBRL(a.valor)}</td>
                <td className="num">{b.areaReal ? fmtBRL(a.valor / b.areaReal) : '—'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              <td />
              <td className="num">{fmtBRL(b.total)}</td>
              <td className="num">{fmtBRL(b.custoM2Real)}</td>
            </tr>
          </tfoot>
        </table>
        <div className="row">
          <button className="secondary" onClick={() => window.print()}>
            Imprimir / salvar PDF
          </button>
        </div>
      </Card>
    </>
  );
}
