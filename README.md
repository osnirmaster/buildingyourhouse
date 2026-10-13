# BuildingYourHouse

Orçamento paramétrico e análise de custo de obras residenciais, usando o **CUB/m² do Sinduscon-SP** (NBR 12721) para o Estado de São Paulo.

**Acesse:** https://osnirmaster.github.io/buildingyourhouse/ (deploy automático no GitHub Pages a cada push na `main`).

Aplicação web 100% no navegador (React + Vite + TypeScript + Zustand). Os dados ficam no `localStorage`; use **Exportar/Importar backup** (JSON) para não perdê-los quando o cache do navegador for limpo.

## Funcionalidades

- **Projetos**: vários projetos, duplicar para simular cenários.
- **Dados e cômodos**: tipo (R-1 casa, R-8, R-16), padrão (baixo / normal / alto), regime (desonerado ou não), cômodos com área e **tipo de área** (coeficientes de área equivalente da NBR 12721: garagem, varanda, piscina, áreas descobertas…).
- **Importar planta PDF**: lê o texto do PDF no navegador (pdf.js), encontra áreas (`A=12,50m²`, `ÁREA: 12,50 m2`, `ÁREA TOTAL`) e associa ao nome do cômodo mais próximo. Mostra a confiança de cada associação e permite revisar antes de importar.
- **Orçamento**: custo base (CUB × área equivalente), distribuição por etapa, itens que o CUB não inclui (fundações, projetos, taxas, BDI, contingência), comparativo entre padrões, impressão.
- **Cronograma físico-financeiro**: desembolso mensal estimado.
- **Gastos**: lançamentos reais e comparação orçado × realizado por etapa.
- **Tabelas**: CUB, pesos das etapas e coeficientes editáveis (atualize o CUB todo mês).

Valores de referência iniciais: CUB Sinduscon-SP, **agosto/2026**.

## Rodar

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # testes de cálculo e da extração do PDF
npm run build
```

## Estrutura

```
src/
  data/referencias.ts   CUB-SP, etapas, coeficientes NBR 12721, itens fora do CUB
  store/useStore.ts     estado global (Zustand + persist no localStorage)
  lib/calc.ts           orçamento, comparativo, cronograma
  lib/pdfExtract.ts     heurística de extração de cômodos/áreas (pura, testável)
  lib/pdfLoader.ts      leitura do PDF com pdf.js (carregado sob demanda)
  lib/backup.ts         exportar/importar JSON
  components/           telas
```

## Próximos passos sugeridos

- **OCR para PDFs digitalizados** (tesseract.js) quando o PDF não tiver camada de texto.
- **Leitura de DWG/DXF/IFC**: arquivos do projeto trazem polígonos e nomes dos ambientes com área exata, muito mais confiáveis que o PDF.
- **Visão computacional / LLM multimodal** para ler plantas como imagem e sugerir cômodos, esquadrias e acabamentos.
- **Orçamento analítico com SINAPI-SP**: quantitativos por cômodo (piso = área, parede ≈ perímetro × pé-direito) e composições SINAPI para materiais e mão de obra.
- **Atualização automática do CUB** (backend que busca o valor mensal) e correção do orçamento pelo INCC.
- **Sincronização na nuvem** opcional (Supabase/Firebase) e compartilhamento com o engenheiro.
- **Fluxo de caixa x financiamento** (medições da Caixa, parcelas) e exportação para Excel.

## Fluxo de trabalho (git flow)

```
feature/*  ──PR──▶  develop  ──PR──▶  main  ──▶  GitHub Pages
```

- Toda alteração começa numa branch `feature/<nome>` (ou `fix/<nome>`) criada a partir de `develop`.
- PR `feature/*` → `develop`: o CI roda lint, testes e build.
- PR `develop` → `main`: o mesmo CI; ao fazer o merge, o deploy no GitHub Pages é automático.
- `develop` e `main` são protegidas: não aceitam push direto e exigem CI verde (`build` e `branch-policy`).
- Hotfix urgente: `hotfix/*` a partir de `main`, PR para `main` e depois para `develop`.

```bash
git checkout develop && git pull
git checkout -b feature/minha-alteracao
# ... commits ...
git push -u origin feature/minha-alteracao
gh pr create --base develop
```
