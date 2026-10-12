import { useStore } from '../store/useStore';
import { PADRAO_LABEL, SOURCES, TIPO_LABEL } from '../data/referencias';
import { fmtPct } from '../lib/format';
import type { Padrao, Regime, TipoProjeto } from '../types';
import { Card, NumInput } from './ui';

const REGIMES: [Regime, string][] = [
  ['naoDesonerado', 'Não desonerado'],
  ['desonerado', 'Desonerado'],
];
const PADROES: Padrao[] = ['baixo', 'normal', 'alto'];

export function TablesView() {
  const { cub, stages, areaTipos, setCub, setStages, setAreaTipos, resetReferencias } = useStore();
  const somaEtapas = stages.reduce((s, e) => s + e.percentual, 0);

  const setValor = (regime: Regime, tipo: TipoProjeto, padrao: Padrao, v: number) =>
    setCub({
      ...cub,
      valores: {
        ...cub.valores,
        [regime]: { ...cub.valores[regime], [tipo]: { ...cub.valores[regime][tipo], [padrao]: v > 0 ? v : undefined } },
      },
    });

  return (
    <>
      <Card
        title="CUB/m² — Sinduscon-SP"
        actions={
          <button className="secondary" onClick={() => window.confirm('Restaurar tabelas de referência originais?') && resetReferencias()}>
            Restaurar padrões
          </button>
        }
      >
        <div className="row">
          <label>
            Mês de referência
            <input type="month" value={cub.referencia} onChange={(e) => setCub({ ...cub, referencia: e.target.value })} />
          </label>
        </div>
        <p className="hint">{cub.fonte}. O Sinduscon-SP publica o CUB todo mês; atualize os valores aqui (0 = não publicado).</p>
        {REGIMES.map(([regime, label]) => (
          <div key={regime}>
            <h3>{label}</h3>
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  {PADROES.map((p) => (
                    <th key={p} className="num">
                      {PADRAO_LABEL[p]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(Object.keys(TIPO_LABEL) as TipoProjeto[]).map((tipo) => (
                  <tr key={tipo}>
                    <td>{TIPO_LABEL[tipo]}</td>
                    {PADROES.map((p) => (
                      <td key={p} className="num">
                        <NumInput value={cub.valores[regime][tipo]?.[p] ?? 0} onChange={(v) => setValor(regime, tipo, p, v)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </Card>

      <Card title="Distribuição por etapa e janela no cronograma">
        <p className={Math.abs(somaEtapas - 100) > 0.01 ? 'hint error' : 'hint'}>
          Soma: {fmtPct(somaEtapas)} {Math.abs(somaEtapas - 100) > 0.01 && '(os valores são normalizados para 100% no cálculo)'}
        </p>
        <table>
          <thead>
            <tr>
              <th>Etapa</th>
              <th className="num">% custo</th>
              <th className="num">Início (%)</th>
              <th className="num">Fim (%)</th>
            </tr>
          </thead>
          <tbody>
            {stages.map((s, i) => {
              const upd = (patch: Partial<typeof s>) => setStages(stages.map((x, j) => (j === i ? { ...x, ...patch } : x)));
              return (
                <tr key={s.id}>
                  <td>{s.nome}</td>
                  <td className="num">
                    <NumInput step={0.5} value={s.percentual} onChange={(v) => upd({ percentual: v })} />
                  </td>
                  <td className="num">
                    <NumInput step={5} value={Math.round(s.inicio * 100)} onChange={(v) => upd({ inicio: Math.min(v, 100) / 100 })} />
                  </td>
                  <td className="num">
                    <NumInput step={5} value={Math.round(s.fim * 100)} onChange={(v) => upd({ fim: Math.min(v, 100) / 100 })} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Card title="Coeficientes de área equivalente (NBR 12721)">
        <table>
          <thead>
            <tr>
              <th>Tipo de área</th>
              <th>Faixa da norma</th>
              <th className="num">Coeficiente usado</th>
            </tr>
          </thead>
          <tbody>
            {areaTipos.map((t, i) => (
              <tr key={t.id}>
                <td>{t.nome}</td>
                <td>{t.faixa}</td>
                <td className="num">
                  <NumInput
                    step={0.05}
                    value={t.coeficiente}
                    onChange={(v) => setAreaTipos(areaTipos.map((x, j) => (j === i ? { ...x, coeficiente: v } : x)))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title="Fontes oficiais">
        <ul>
          {SOURCES.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.nome}
              </a>
            </li>
          ))}
        </ul>
        <p className="hint">
          Estimativas pelo CUB são paramétricas (fase de anteprojeto). Para orçamento executivo, use composições SINAPI com
          quantitativos reais.
        </p>
      </Card>
    </>
  );
}
