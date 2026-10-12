import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useActiveProject, useStore } from '../store/useStore';
import { calcBudget, realizadoPorEtapa } from '../lib/calc';
import { fmtBRL, fmtBRLCompact, fmtPct } from '../lib/format';
import { Card, Empty, NumInput, Stat } from './ui';
import { INK, SERIES, axisProps } from './charts';

export function ExpensesView() {
  const project = useActiveProject();
  const { cub, stages, areaTipos, addExpense, removeExpense } = useStore();
  const [form, setForm] = useState(() => ({ data: new Date().toISOString().slice(0, 10), etapaId: stages[0]?.id ?? '', descricao: '', valor: 0 }));
  if (!project) return <Empty>Selecione ou crie um projeto na aba Projetos.</Empty>;

  const b = calcBudget(project, cub, stages, areaTipos);
  const realizado = realizadoPorEtapa(project);
  const itens = [...b.etapas, ...b.adicionais];
  const nomes = new Map(itens.map((i) => [i.id, i.nome]));
  const totalGasto = project.expenses.reduce((s, e) => s + e.valor, 0);
  const comparativo = itens
    .map((i) => ({ nome: i.nome, orcado: i.valor, realizado: realizado[i.id] ?? 0 }))
    .filter((i) => i.realizado > 0 || i.orcado > 0);

  const salvar = () => {
    if (form.valor <= 0 || !form.etapaId) return;
    addExpense(project.id, { ...form, descricao: form.descricao.trim() });
    setForm({ ...form, descricao: '', valor: 0 });
  };

  return (
    <>
      <div className="stats">
        <Stat label="Orçado" value={fmtBRL(b.total)} />
        <Stat label="Gasto até agora" value={fmtBRL(totalGasto)} hint={b.total ? `${fmtPct((totalGasto / b.total) * 100)} do orçado` : undefined} />
        <Stat label="Saldo" value={fmtBRL(b.total - totalGasto)} />
      </div>

      <Card title="Lançar gasto">
        <form
          className="row wrap"
          onSubmit={(e) => {
            e.preventDefault();
            salvar();
          }}
        >
          <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
          <select value={form.etapaId} onChange={(e) => setForm({ ...form, etapaId: e.target.value })}>
            {itens.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </select>
          <input placeholder="Descrição (ex.: cimento, pedreiro)" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          <NumInput aria-label="Valor R$" value={form.valor} onChange={(v) => setForm({ ...form, valor: v })} />
          <button type="submit">Lançar</button>
        </form>
      </Card>

      {project.expenses.length > 0 && (
        <Card title="Orçado × realizado por etapa">
          <ResponsiveContainer width="100%" height={Math.max(260, comparativo.length * 34)}>
            <BarChart data={comparativo} layout="vertical" margin={{ left: 8, right: 24 }} barGap={2}>
              <CartesianGrid horizontal={false} stroke={INK.grid} />
              <XAxis type="number" tickFormatter={fmtBRLCompact} {...axisProps} />
              <YAxis type="category" dataKey="nome" width={190} {...axisProps} />
              <Tooltip formatter={(v) => fmtBRL(Number(v))} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
              <Legend wrapperStyle={{ color: INK.secondary }} />
              <Bar dataKey="orcado" name="Orçado" fill={SERIES[0]} radius={[0, 4, 4, 0]} barSize={10} />
              <Bar dataKey="realizado" name="Realizado" fill={SERIES[1]} radius={[0, 4, 4, 0]} barSize={10} />
            </BarChart>
          </ResponsiveContainer>
          <table>
            <thead>
              <tr>
                <th>Etapa</th>
                <th className="num">Orçado</th>
                <th className="num">Realizado</th>
                <th className="num">Desvio</th>
              </tr>
            </thead>
            <tbody>
              {comparativo
                .filter((c) => c.realizado > 0)
                .map((c) => {
                  const desvio = c.realizado - c.orcado;
                  return (
                    <tr key={c.nome}>
                      <td>{c.nome}</td>
                      <td className="num">{fmtBRL(c.orcado)}</td>
                      <td className="num">{fmtBRL(c.realizado)}</td>
                      <td className={`num ${desvio > 0 ? 'error' : ''}`}>
                        {desvio > 0 ? '▲ ' : '▼ '}
                        {fmtBRL(Math.abs(desvio))}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </Card>
      )}

      <Card title="Lançamentos">
        {project.expenses.length === 0 ? (
          <Empty>Nenhum gasto lançado.</Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Etapa</th>
                <th>Descrição</th>
                <th className="num">Valor</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {[...project.expenses]
                .sort((x, y) => y.data.localeCompare(x.data))
                .map((e) => (
                  <tr key={e.id}>
                    <td>{new Date(`${e.data}T12:00`).toLocaleDateString('pt-BR')}</td>
                    <td>{nomes.get(e.etapaId) ?? e.etapaId}</td>
                    <td>{e.descricao}</td>
                    <td className="num">{fmtBRL(e.valor)}</td>
                    <td>
                      <button className="danger small" onClick={() => removeExpense(project.id, e.id)} aria-label="Remover">
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
