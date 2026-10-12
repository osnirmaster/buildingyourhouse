import { useState } from 'react';
import { useActiveProject, useStore } from '../store/useStore';
import type { ExtractedRoom, PdfExtraction } from '../lib/pdfExtract';
import { fmtM2 } from '../lib/format';
import { Card, Empty, NumInput } from './ui';

type Linha = ExtractedRoom & { incluir: boolean };

export function PdfImportView({ onDone }: { onDone: () => void }) {
  const project = useActiveProject();
  const { areaTipos, addRooms, updateProject } = useStore();
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [result, setResult] = useState<PdfExtraction | null>(null);
  const [linhas, setLinhas] = useState<Linha[]>([]);

  if (!project) return <Empty>Selecione ou crie um projeto na aba Projetos.</Empty>;

  const onFile = async (file: File) => {
    setLoading(true);
    setErro(null);
    try {
      const { extractFromPdf } = await import('../lib/pdfLoader');
      const r = await extractFromPdf(file);
      setResult(r);
      setLinhas(r.rooms.map((x) => ({ ...x, incluir: x.nome !== 'Ambiente não identificado' })));
    } catch (e) {
      setErro(`Não foi possível ler o PDF: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const upd = (i: number, patch: Partial<Linha>) => setLinhas((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const selecionadas = linhas.filter((l) => l.incluir);
  const soma = selecionadas.reduce((s, l) => s + l.area, 0);

  const importar = () => {
    addRooms(
      project.id,
      selecionadas.map((l) => ({ nome: l.nome, area: l.area, tipoArea: l.tipoArea, origem: 'pdf' as const })),
    );
    if (result?.areaTotal) updateProject(project.id, { areaTotalDeclarada: result.areaTotal });
    setResult(null);
    setLinhas([]);
    onDone();
  };

  return (
    <Card title="Importar planta (PDF)">
      <p className="hint">
        O PDF é lido <strong>no seu navegador</strong> (nada é enviado). A ferramenta procura textos de área como
        “A = 12,50 m²”, “ÁREA: 12,50m2”, “ÁREA TOTAL” e associa ao nome de cômodo mais próximo na planta. Revise antes
        de importar.
      </p>
      <input type="file" accept="application/pdf" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      {loading && <p>Lendo PDF…</p>}
      {erro && <p className="error">{erro}</p>}

      {result && (
        <>
          <p>
            {result.paginas} página(s) · {result.rooms.length} ambiente(s) encontrados
            {result.areaTotal ? ` · Área total declarada: ${fmtM2(result.areaTotal)}` : ''}
          </p>
          {result.avisos.map((a) => (
            <p key={a} className="badge warn">
              ⚠ {a}
            </p>
          ))}
          {linhas.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>Incluir</th>
                  <th>Cômodo</th>
                  <th className="num">Área (m²)</th>
                  <th>Tipo de área</th>
                  <th>Confiança</th>
                  <th>Texto encontrado</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l, i) => (
                  <tr key={i}>
                    <td>
                      <input type="checkbox" checked={l.incluir} onChange={(e) => upd(i, { incluir: e.target.checked })} />
                    </td>
                    <td>
                      <input value={l.nome} onChange={(e) => upd(i, { nome: e.target.value })} />
                    </td>
                    <td className="num">
                      <NumInput value={l.area} onChange={(v) => upd(i, { area: v })} />
                    </td>
                    <td>
                      <select value={l.tipoArea} onChange={(e) => upd(i, { tipoArea: e.target.value })}>
                        {areaTipos.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.nome}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span className={`tag conf-${l.confianca}`}>{l.confianca}</span>
                    </td>
                    <td>
                      <small>
                        p.{l.pagina}: {l.trecho}
                      </small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="row">
            <span>
              Selecionados: {selecionadas.length} · Soma: {fmtM2(soma)}
            </span>
            <button disabled={selecionadas.length === 0} onClick={importar}>
              Adicionar ao projeto
            </button>
          </div>
        </>
      )}
    </Card>
  );
}
