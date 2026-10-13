import { useRef, useState, type DragEvent } from 'react';
import { useActiveProject, useStore } from '../store/useStore';
import type { ExtractedRoom, PdfExtraction } from '../lib/pdfExtract';
import { fmtM2 } from '../lib/format';
import { Card, NumInput } from './ui';

type Linha = ExtractedRoom & { incluir: boolean };

const CONFIANCA_LABEL = { alta: 'alta', media: 'média', baixa: 'baixa' } as const;

export function PdfImportView({ onDone }: { onDone: () => void }) {
  const project = useActiveProject();
  const { areaTipos, addRooms, updateProject, createProject } = useStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<string | null>(null);
  const [progresso, setProgresso] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [result, setResult] = useState<PdfExtraction | null>(null);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [destino, setDestino] = useState<'ativo' | 'novo'>('ativo');

  const onFile = async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErro('Selecione um arquivo PDF.');
      return;
    }
    setArquivo(file.name);
    setErro(null);
    setResult(null);
    setProgresso('Carregando leitor de PDF…');
    try {
      const { extractFromPdf } = await import('../lib/pdfLoader');
      const r = await extractFromPdf(file, (p, total) => setProgresso(`Lendo página ${p} de ${total}…`));
      setResult(r);
      setLinhas(r.rooms.map((x) => ({ ...x, incluir: !x.duplicata && x.nome !== 'Ambiente não identificado' })));
    } catch (e) {
      setErro(`Não foi possível ler o PDF: ${(e as Error).message}`);
    } finally {
      setProgresso(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setArrastando(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };

  const upd = (i: number, patch: Partial<Linha>) => setLinhas((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const selecionadas = linhas.filter((l) => l.incluir);
  const soma = selecionadas.reduce((s, l) => s + l.area, 0);
  const criarNovo = !project || destino === 'novo';

  const importar = () => {
    const id = criarNovo ? createProject(arquivo?.replace(/\.pdf$/i, '') || 'Projeto da planta') : project!.id;
    addRooms(
      id,
      selecionadas.map((l) => ({ nome: l.nome, area: l.area, tipoArea: l.tipoArea, origem: 'pdf' as const })),
    );
    if (result?.areaTotal) updateProject(id, { areaTotalDeclarada: result.areaTotal });
    setResult(null);
    setLinhas([]);
    onDone();
  };

  return (
    <Card title="Importar planta (PDF)">
      <p className="hint">
        O PDF é lido <strong>no seu navegador</strong> (nada é enviado). A ferramenta procura áreas como “A: 12,50 m²” ou
        “ÁREA TOTAL” e usa o texto logo acima como nome do ambiente. Revise antes de importar.
      </p>

      <div
        className={`dropzone${arrastando ? ' over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={onDrop}
      >
        <div className="dropzone-icon" aria-hidden>
          ⬆
        </div>
        <strong>Arraste a planta em PDF aqui</strong>
        <span className="hint">ou</span>
        <button onClick={() => inputRef.current?.click()} disabled={!!progresso}>
          Selecionar PDF <span className="arrow">›</span>
        </button>
        {arquivo && <span className="hint">{arquivo}</span>}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          hidden
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
      </div>

      {progresso && <p className="progress">{progresso}</p>}
      {erro && <p className="error">{erro}</p>}

      {result && (
        <>
          <p>
            {result.paginas} página(s) · {result.rooms.length} ambiente(s) encontrado(s)
            {result.areaTotal ? ` · Área total declarada: ${fmtM2(result.areaTotal)}` : ''}
          </p>
          {result.avisos.map((a) => (
            <p key={a} className="badge warn">
              {a}
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
                      <input className="room-name" value={l.nome} onChange={(e) => upd(i, { nome: e.target.value })} />
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
                      <span className={`tag conf-${l.confianca}`}>{CONFIANCA_LABEL[l.confianca]}</span>
                      {l.duplicata && <span className="tag">possível duplicata</span>}
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
          <div className="row wrap import-actions">
            <span>
              Selecionados: <strong>{selecionadas.length}</strong> · Soma: <strong>{fmtM2(soma)}</strong>
            </span>
            {project ? (
              <select value={destino} onChange={(e) => setDestino(e.target.value as 'ativo' | 'novo')}>
                <option value="ativo">Adicionar ao projeto “{project.nome}”</option>
                <option value="novo">Criar novo projeto</option>
              </select>
            ) : (
              <span className="hint">Um novo projeto será criado.</span>
            )}
            <button disabled={selecionadas.length === 0} onClick={importar}>
              {criarNovo ? 'Criar projeto com estes cômodos' : 'Adicionar ao projeto'} <span className="arrow">›</span>
            </button>
          </div>
        </>
      )}
    </Card>
  );
}
