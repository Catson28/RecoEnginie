# ReconEngine — Arquitectura

## Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│              Next.js 15 — http://localhost:3000             │
│   Dashboard · Runs · Open Items · Reports · Engine Config   │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP (SWR polling / fetch)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Nginx (porta 80)                         │
│              Proxy reverso — / → frontend                   │
│                            /api/ → backend                  │
└──────────┬───────────────────────────────────┬──────────────┘
           │                                   │
           ▼                                   ▼
┌──────────────────────┐           ┌──────────────────────────┐
│  FastAPI — porta 8000│           │  Next.js — porta 3000    │
│                      │           │  (Server Side Rendering) │
│  /api/runs           │           └──────────────────────────┘
│  /api/matching       │
│  /api/open-items     │
│  /api/reports        │
│  /api/health         │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│                  Matching Engine (Core)                      │
│                                                              │
│  StatementImporter (CSV/OFX/XLSX)                           │
│       ↓                                                      │
│  Tier 1 — Exact Match (ref_id + amount + date ±2d)          │
│       ↓ (restantes)                                          │
│  Tier 2 — Fuzzy Match (rapidfuzz ≥ 85% + amount + date ±5d) │
│       ↓ (restantes)                                          │
│  Tier 3 — Probable   (amount + date ±7d)                    │
│       ↓ (restantes)                                          │
│  Unmatched A (só ledger) + Unmatched B (só bank)            │
│       ↓                                                      │
│  Open Items criados para revisão manual                     │
└──────────┬───────────────────────────────────────────────────┘
           │ SQLAlchemy ORM
           ▼
┌──────────────────────────────────────────────────────────────┐
│                    MySQL 8.0 — porta 3306                    │
│                                                              │
│  reconciliation_runs      histórico de execuções            │
│  reconciliation_results   pares ledger ↔ bank               │
│  open_items               itens para revisão manual         │
│  transactions             transacções brutas                 │
└──────────────────────────────────────────────────────────────┘
```

---

## Fluxo de uma Reconciliação

```
Utilizador faz upload (ledger.csv + bank.csv)
      │
      ▼
POST /api/runs  →  run criado com status PENDING
      │
      ▼
Background Task inicia
      │
      ├── load_file() → normalizar colunas
      ├── run status = PROCESSING
      │
      ├── Tier 1: join por ref_id
      │       ├── amount_diff == 0 && date_diff <= 2d  → matched (score 100)
      │       └── amount_diff != 0                     → mismatch (score 95)
      │
      ├── Tier 2: rapidfuzz sobre transacções restantes
      │       └── similarity >= 85% + amount == bank   → matched (score = similarity)
      │
      ├── Tier 3: transacções restantes
      │       └── amount == bank + date_diff <= 7d     → probable (score 50–74)
      │
      ├── Restantes → unmatched_a (só ledger) / unmatched_b (só bank)
      │
      ├── Persistir reconciliation_results + open_items
      ├── Actualizar reconciliation_runs com métricas
      └── run status = COMPLETED
```

---

## Modelo de Dados

### reconciliation_runs
Registo de cada execução. Uma linha por run. Contém todos os KPIs agregados (match_rate, open_items_count, open_value, etc.).

### reconciliation_results
Uma linha por par de transacções comparadas. Inclui os dados de ambos os lados, a diferença calculada, o tier e o critério de matching.

### open_items
Subconjunto dos resultados que requerem atenção manual: mismatches, unmatched, e prováveis. Tem ciclo de vida próprio (open → resolved) com auditoria completa.

### transactions
Transacções brutas de cada ficheiro importado. Ligadas ao run e marcadas como `is_matched` após o processo.

---

## Decisões de Arquitectura

**Por que FastAPI?**
Async nativo, documentação automática (Swagger/ReDoc), validação via Pydantic, e performance superior ao Flask para APIs de dados. O background tasks nativo evita precisar de Celery para runs de volume moderado.

**Por que Next.js 15 App Router?**
SSR para carregamento inicial rápido. O App Router permite layouts partilhados (sidebar + topbar) sem repetição. SWR para polling reactivo do estado dos runs.

**Por que SWR em vez de React Query?**
Mais simples para este caso de uso. O `refreshInterval` dinâmico do SWR (só faz polling quando o run está a processar) é elegante e eficiente.

**Por que 3 Tiers e não apenas 1?**
Na realidade, extractos bancários raramente têm ref_ids consistentes com o ledger. O Tier 2 (fuzzy) captura ~10–15% adicional de transacções que o Tier 1 falha. O Tier 3 captura mais ~5% de prováveis, reduzindo o trabalho manual.

**Por que os open items são uma tabela separada?**
Ciclo de vida independente: um open item pode ser resolvido sem alterar o resultado de matching original. Facilita auditoria e relatórios de aging.

---

## Escalabilidade

Para volumes maiores (>100k transacções/run):

1. **Tier 2 paralelo** — o loop Python pode ser paralelizado com `concurrent.futures`
2. **Celery + Redis** — substituir o `BackgroundTasks` do FastAPI por workers Celery
3. **Particionamento MySQL** — particionar `reconciliation_results` por `run_id`
4. **Read replicas** — separar leituras (dashboard) de escritas (engine)
