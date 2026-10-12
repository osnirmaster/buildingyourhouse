import { useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { exportBackup, readBackup } from '../lib/backup';

const DIAS_LEMBRETE = 7;

export function Header() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [agora] = useState(() => Date.now());
  const { projects, cub, stages, areaTipos, lastBackupAt, importData, markBackup } = useStore();

  const onExport = () => {
    exportBackup({ projects, cub, stages, areaTipos });
    markBackup();
    setMsg('Backup exportado.');
  };

  const onImport = async (file: File) => {
    try {
      const data = await readBackup(file);
      const replace = window.confirm(
        `Backup com ${data.projects.length} projeto(s).\n\nOK = substituir todos os dados atuais\nCancelar = mesclar (mantém os atuais e adiciona/atualiza os do arquivo)`,
      );
      importData(data, replace ? 'replace' : 'merge');
      setMsg(replace ? 'Dados substituídos pelo backup.' : 'Projetos do backup mesclados.');
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const dias = lastBackupAt ? (agora - new Date(lastBackupAt).getTime()) / 86_400_000 : Infinity;
  const lembrar = projects.length > 0 && dias > DIAS_LEMBRETE;

  return (
    <header className="app-header">
      <div className="brand">
        <span className="logo" aria-hidden>
          🏠
        </span>
        <div>
          <h1>BuildingYourHouse</h1>
          <small>Orçamento e análise de custo de obras — CUB Sinduscon-SP</small>
        </div>
      </div>
      <div className="header-actions">
        {lembrar && (
          <span className="badge warn" title="Os dados ficam só neste navegador">
            ⚠ {lastBackupAt ? `Último backup há ${Math.floor(dias)} dias` : 'Nenhum backup feito'}
          </span>
        )}
        {msg && (
          <span className="badge" onClick={() => setMsg(null)}>
            {msg}
          </span>
        )}
        <button onClick={onExport}>Exportar backup</button>
        <button className="secondary" onClick={() => fileRef.current?.click()}>
          Importar backup
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])}
        />
      </div>
    </header>
  );
}
