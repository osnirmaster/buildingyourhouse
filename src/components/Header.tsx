import { useRef, useState } from 'react';
import { useActiveProject, useStore } from '../store/useStore';
import { exportBackup, readBackup } from '../lib/backup';

const DIAS_LEMBRETE = 7;

export interface TabDef<T extends string> {
  id: T;
  label: string;
}

export function Header<T extends string>({ tabs, tab, onTab }: { tabs: readonly TabDef<T>[]; tab: T; onTab: (t: T) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [agora] = useState(() => Date.now());
  const { projects, cub, stages, areaTipos, lastBackupAt, importData, markBackup } = useStore();
  const project = useActiveProject();

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
    <header className="topnav">
      <div className="container topnav-inner">
        <button className="wordmark" onClick={() => onTab(tabs[0].id)}>
          buildingyourhouse
        </button>
        <nav className="navlinks" aria-label="Seções">
          {tabs.map((t) => (
            <button key={t.id} className={tab === t.id ? 'navlink active' : 'navlink'} onClick={() => onTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
        <div className="topnav-actions">
          <button className="btn-link" onClick={() => fileRef.current?.click()}>
            Importar backup
          </button>
          <button className="btn-pill" onClick={onExport}>
            Exportar backup <span className="arrow">›</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])}
          />
        </div>
      </div>
      {(lembrar || msg || project) && (
        <div className="container notice-row">
          {project && <span className="chip">Projeto ativo: {project.nome}</span>}
          {lembrar && (
            <span className="chip warn" title="Os dados ficam só neste navegador">
              {lastBackupAt ? `Último backup há ${Math.floor(dias)} dias` : 'Nenhum backup feito ainda'}
            </span>
          )}
          {msg && (
            <button className="chip" onClick={() => setMsg(null)}>
              {msg} ✕
            </button>
          )}
        </div>
      )}
    </header>
  );
}
