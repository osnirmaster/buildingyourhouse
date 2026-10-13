import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppData, CubTable, Expense, Project, Room, Stage, AreaTipo } from '../types';
import { ADICIONAIS_PADRAO, AREA_TIPOS_PADRAO, CUB_SP_PADRAO, ETAPAS_PADRAO } from '../data/referencias';

export const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

interface State extends AppData {
  activeProjectId: string | null;
  lastBackupAt: string | null;

  createProject: (nome: string) => string;
  createDemoProject: () => void;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => void;
  setActive: (id: string | null) => void;

  addRooms: (projectId: string, rooms: Omit<Room, 'id'>[]) => void;
  updateRoom: (projectId: string, roomId: string, patch: Partial<Room>) => void;
  removeRoom: (projectId: string, roomId: string) => void;

  addExpense: (projectId: string, expense: Omit<Expense, 'id'>) => void;
  removeExpense: (projectId: string, expenseId: string) => void;

  setCub: (cub: CubTable) => void;
  setStages: (stages: Stage[]) => void;
  setAreaTipos: (tipos: AreaTipo[]) => void;
  resetReferencias: () => void;

  importData: (data: AppData, mode: 'replace' | 'merge') => void;
  markBackup: () => void;
}

const DEMO_ROOMS: [string, number, string][] = [
  ['Sala de estar e jantar', 32, 'principal'],
  ['Cozinha', 14, 'principal'],
  ['Suíte', 16, 'principal'],
  ['Banheiro da suíte', 5, 'principal'],
  ['Dormitório 1', 11, 'principal'],
  ['Dormitório 2', 10, 'principal'],
  ['Banheiro social', 4.5, 'principal'],
  ['Área de serviço', 6, 'principal'],
  ['Circulação', 7, 'principal'],
  ['Garagem', 30, 'garagem'],
  ['Varanda gourmet', 18, 'varanda'],
];

const newProject =(nome: string): Project => ({
  id: uid(),
  nome,
  cidade: 'São Paulo',
  tipo: 'R1',
  padrao: 'normal',
  regime: 'naoDesonerado',
  duracaoMeses: 12,
  observacoes: '',
  rooms: [],
  adicionais: ADICIONAIS_PADRAO.map((a) => ({ ...a })),
  expenses: [],
  criadoEm: now(),
  atualizadoEm: now(),
});

export const useStore = create<State>()(
  persist(
    (set, get) => {
      const patchProject = (id: string, fn: (p: Project) => Partial<Project>) =>
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, ...fn(p), atualizadoEm: now() } : p)),
        }));

      return {
        projects: [],
        cub: CUB_SP_PADRAO,
        stages: ETAPAS_PADRAO,
        areaTipos: AREA_TIPOS_PADRAO,
        activeProjectId: null,
        lastBackupAt: null,

        createProject: (nome) => {
          const p = newProject(nome);
          set((s) => ({ projects: [...s.projects, p], activeProjectId: p.id }));
          return p.id;
        },
        createDemoProject: () => {
          const p = newProject('Casa exemplo — 3 dormitórios');
          p.rooms = DEMO_ROOMS.map(([nome, area, tipoArea]) => ({ id: uid(), nome, area, tipoArea, origem: 'manual' }));
          set((s) => ({ projects: [...s.projects, p], activeProjectId: p.id }));
        },
        updateProject: (id, patch) => patchProject(id, () => patch),
        deleteProject: (id) =>
          set((s) => ({
            projects: s.projects.filter((p) => p.id !== id),
            activeProjectId: s.activeProjectId === id ? null : s.activeProjectId,
          })),
        duplicateProject: (id) => {
          const src = get().projects.find((p) => p.id === id);
          if (!src) return;
          const copy: Project = {
            ...structuredClone(src),
            id: uid(),
            nome: `${src.nome} (cópia)`,
            criadoEm: now(),
            atualizadoEm: now(),
          };
          set((s) => ({ projects: [...s.projects, copy], activeProjectId: copy.id }));
        },
        setActive: (id) => set({ activeProjectId: id }),

        addRooms: (projectId, rooms) =>
          patchProject(projectId, (p) => ({ rooms: [...p.rooms, ...rooms.map((r) => ({ ...r, id: uid() }))] })),
        updateRoom: (projectId, roomId, patch) =>
          patchProject(projectId, (p) => ({ rooms: p.rooms.map((r) => (r.id === roomId ? { ...r, ...patch } : r)) })),
        removeRoom: (projectId, roomId) =>
          patchProject(projectId, (p) => ({ rooms: p.rooms.filter((r) => r.id !== roomId) })),

        addExpense: (projectId, expense) =>
          patchProject(projectId, (p) => ({ expenses: [...p.expenses, { ...expense, id: uid() }] })),
        removeExpense: (projectId, expenseId) =>
          patchProject(projectId, (p) => ({ expenses: p.expenses.filter((e) => e.id !== expenseId) })),

        setCub: (cub) => set({ cub }),
        setStages: (stages) => set({ stages }),
        setAreaTipos: (areaTipos) => set({ areaTipos }),
        resetReferencias: () => set({ cub: CUB_SP_PADRAO, stages: ETAPAS_PADRAO, areaTipos: AREA_TIPOS_PADRAO }),

        importData: (data, mode) =>
          set((s) => {
            if (mode === 'replace') {
              return { ...data, activeProjectId: data.projects[0]?.id ?? null };
            }
            const byId = new Map(s.projects.map((p) => [p.id, p]));
            for (const p of data.projects) byId.set(p.id, p);
            return { projects: [...byId.values()] };
          }),
        markBackup: () => set({ lastBackupAt: now() }),
      };
    },
    {
      name: 'buildingyourhouse',
      version: 1,
      partialize: (s) => ({
        projects: s.projects,
        cub: s.cub,
        stages: s.stages,
        areaTipos: s.areaTipos,
        activeProjectId: s.activeProjectId,
        lastBackupAt: s.lastBackupAt,
      }),
    },
  ),
);

export const useActiveProject = () =>
  useStore((s) => s.projects.find((p) => p.id === s.activeProjectId) ?? null);
