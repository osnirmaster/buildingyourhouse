import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useActiveProject, useStore } from '../store/useStore';
import { calcBudget, compararPadroes } from '../lib/calc';
import { fmtBRL, fmtBRLCompact, fmtM2, fmtPct } from '../lib/format';
import { CONTRATACAO_INFO, PADRAO_LABEL } from '../data/referencias';
import { Card, Empty, NumInput, Stat } from './ui';
import { INK, SERIES, axisProps, legendFormatter } from './charts';

const PADRAO_CURTO = { baixo: 'Baixo', normal: 'Médio', alto: 'Alto' } as const;

export function BudgetView() {
  const project = useActiveProject();
  const { cub, stages, areaTipos, updateProject } = useStore();
  if (!project) return <Empty>Selecione ou crie um projeto na aba Projetos.</Empty>;
  if (project.rooms.length === 0) return <Empty>Cadastre os cômodos do projeto para calcular o orçamento.</Empty>;

  const b = calcBudget(project, cub, stages, areaTipos);
  const comparativo = compararPadroes(project, cub, stages, areaTipos);
  const etapasOrdenadas = [...b.etapas].sort((x, y) => y.valor - x.valor);
  const pctDireto = (v: number) => fmtPct(b.custoDireto ? (v / b.custoDireto) * 100 : 0);
  const valorAdicional = (id: string) => b.adicionais.find((x) => x.id === id)?.valor;

  const setAdicional = (id: string, patch: { ativo?: boolean; percentual?: number }) =>
    updateProject(project.id, { adicionais: project.adicionais.map((a) => (a.id === id ? { ...a, ...patch } : a)) });

  return (
    <>
      {b.cubM2 === null && (
        <p className="badge warn">⚠ CUB não publicado para esta combinação de tipo/padrão/regime. Ajuste em Dados.</p>
      )}
      <div className="stats">
        <Stat label="Custo total estimado" value={fmtBRL(b.total)} hint={`${PADRAO_LABEL[project.padrao]} · ${CONTRATACAO_INFO[project.contratacao].nome}`} />
        <Stat label="Custo por m² (área real)" value={fmtBRL(b.custoM2Real)} hint={`CUB ${b.cubM2 ? fmtBRL(b.cubM2) : '—'}/m² · ${fmtM2(b.areaReal)}`} />
        <Stat label="Materiais" value={fmtBRL(b.totalMaterial)} hint={`${pctDireto(b.totalMaterial)} do custo direto`} />
        <Stat label="Mão de obra" value={fmtBRL(b.totalMaoDeObra)} hint={`${pctDireto(b.totalMaoDeObra)} do custo direto`} />
        <Stat label="Fora do CUB" value={fmtBRL(b.totalAdicionais)} hint="Fundações, projetos, BDI, taxas…" />
      </div>

      <div className="two-col">
        <Card title="Custo por etapa da obra">
          <ResponsiveContainer width="100%" height={420}>
            <BarChart data={etapasOrdenadas} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid horizontal={false} stroke={INK.grid} />
              <XAxis type="number" tickFormatter={fmtBRLCompact} {...axisProps} />
              <YAxis type="category" dataKey="nome" width={190} {...axisProps} />
              <Tooltip formatter={(v) => fmtBRL(Number(v))} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
              <Legend formatter={legendFormatter} />
              <Bar dataKey="valorMaterial" name="Materiais" stackId="e" fill={SERIES[0]} stroke="#fff" strokeWidth={2} barSize={16} />
              <Bar dataKey="valorMaoDeObra" name="Mão de obra" stackId="e" fill={SERIES[1]} stroke="#fff" strokeWidth={2} radius={[0, 4, 4, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Comparativo por padrão de acabamento">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={comparativo.map((c) => ({ ...c, nome: PADRAO_CURTO[c.padrao] }))} margin={{ right: 16 }}>
              <CartesianGrid vertical={false} stroke={INK.grid} />
              <XAxis dataKey="nome" interval={0} {...axisProps} />
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
        <p className="hint">
          Percentuais sobre o custo direto da obra (exceto INSS, sobre a mão de obra). Os itens de BDI e INSS mudam conforme a
          forma de contratação escolhida em Cômodos.
        </p>
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
                  {a.base === 'maoDeObra' && <small> da mão de obra</small>}
                </td>
                <td className="num">{a.ativo ? fmtBRL(valorAdicional(a.id) ?? 0) : '—'}</td>
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
              <th className="num">% do custo</th>
              <th className="num">Materiais</th>
              <th className="num">Mão de obra</th>
              <th className="num">Total</th>
              <th className="num">R$/m²</th>
            </tr>
          </thead>
          <tbody>
            {b.etapas.map((e) => (
              <tr key={e.id}>
                <td>{e.nome}</td>
                <td className="num">{fmtPct(e.percentual)}</td>
                <td className="num">{fmtBRL(e.valorMaterial)}</td>
                <td className="num">{fmtBRL(e.valorMaoDeObra)}</td>
                <td className="num">{fmtBRL(e.valor)}</td>
                <td className="num">{b.areaReal ? fmtBRL(e.valor / b.areaReal) : '—'}</td>
              </tr>
            ))}
            {b.adicionais.map((a) => (
              <tr key={a.id} className="muted-row">
                <td>{a.nome} (fora do CUB)</td>
                <td className="num">{fmtPct(a.percentual)}</td>
                <td />
                <td />
                <td className="num">{fmtBRL(a.valor)}</td>
                <td className="num">{b.areaReal ? fmtBRL(a.valor / b.areaReal) : '—'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              <td />
              <td className="num">{fmtBRL(b.totalMaterial)}</td>
              <td className="num">{fmtBRL(b.totalMaoDeObra)}</td>
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
