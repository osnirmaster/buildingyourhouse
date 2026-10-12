import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useActiveProject, useStore } from '../store/useStore';
import { calcBudget, cronograma } from '../lib/calc';
import { fmtBRL, fmtBRLCompact, fmtPct } from '../lib/format';
import { Card, Empty } from './ui';
import { INK, SERIES, axisProps } from './charts';

export function ScheduleView() {
  const project = useActiveProject();
  const { cub, stages, areaTipos } = useStore();
  if (!project) return <Empty>Selecione ou crie um projeto na aba Projetos.</Empty>;
  if (project.rooms.length === 0) return <Empty>Cadastre os cômodos do projeto para gerar o cronograma.</Empty>;

  const b = calcBudget(project, cub, stages, areaTipos);
  const meses = cronograma(b, project.duracaoMeses);
  const pico = Math.max(...meses.map((m) => m.valor));

  return (
    <>
      <Card title={`Cronograma físico-financeiro — ${project.duracaoMeses} meses`}>
        <p className="hint">
          Desembolso mensal estimado. Pico: <strong>{fmtBRL(pico)}</strong> · média {fmtBRL(b.total / meses.length)}/mês. Altere a
          duração em Dados e as janelas de cada etapa em Tabelas.
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={meses.map((m) => ({ ...m, label: `Mês ${m.mes}` }))} margin={{ right: 16 }}>
            <CartesianGrid vertical={false} stroke={INK.grid} />
            <XAxis dataKey="label" {...axisProps} />
            <YAxis tickFormatter={fmtBRLCompact} width={80} {...axisProps} />
            <Tooltip formatter={(v) => fmtBRL(Number(v))} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
            <Bar dataKey="valor" name="Desembolso" fill={SERIES[0]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <Card title="Tabela mensal">
        <table>
          <thead>
            <tr>
              <th>Mês</th>
              <th className="num">Desembolso</th>
              <th className="num">Acumulado</th>
              <th className="num">% acumulado</th>
              <th>Principais etapas</th>
            </tr>
          </thead>
          <tbody>
            {meses.map((m) => {
              const nomes = new Map([...b.etapas, ...b.adicionais].map((e) => [e.id, e.nome]));
              const top = Object.entries(m.porEtapa)
                .sort((x, y) => y[1] - x[1])
                .slice(0, 3)
                .map(([id]) => nomes.get(id));
              return (
                <tr key={m.mes}>
                  <td>{m.mes}</td>
                  <td className="num">{fmtBRL(m.valor)}</td>
                  <td className="num">{fmtBRL(m.acumulado)}</td>
                  <td className="num">{fmtPct(m.acumuladoPct)}</td>
                  <td>
                    <small>{top.join(', ')}</small>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </>
  );
}
