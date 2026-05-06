# ReconEngine — Ficheiros de Teste

Usa estes ficheiros CSV para testar o sistema. Cada par tem um cenário diferente.

---

## Par 1 — Maio 2024 (Cenário Típico)

| Ficheiro | Descrição |
|----------|-----------|
| `ledger_may_2024.csv` | 30 transacções do sistema contabilístico |
| `bank_statement_may_2024.csv` | 31 transacções do extracto bancário |

**O que este par demonstra:**
- **28 matched (Tier 1)** — ref_id exacto, amount exacto
- **1 matched (Tier 2)** — payroll sem ref_id, fuzzy por descrição
- **1 mismatch** — Invoice #INV-2089 com diferença de $455 (ledger: $15,500 vs bank: $15,045)
- **1 unmatched A** — Petty Cash $350 (só no ledger, não chegou ao banco)
- **1 unmatched B** — Bank Service Charge $250 (só no banco, não registado no ledger)
- **1 unmatched B** — Wire Fee $45 (taxa bancária não contabilizada)

**Match rate esperado: ~92%**

---

## Par 2 — Junho 2024 (Quase Perfeito)

| Ficheiro | Descrição |
|----------|-----------|
| `ledger_june_2024.csv` | 25 transacções do sistema contabilístico |
| `bank_statement_june_2024.csv` | 27 transacções do extracto bancário |

**O que este par demonstra:**
- **24 matched (Tier 1/2)** — todos os itens do ledger reconciliados
- **0 mismatches** — sem diferenças de valor
- **0 unmatched A** — todos os itens do ledger estão no banco
- **2 unmatched B** — Bank Wire Fee $35 + Bank Service Charge $250 (taxas bancárias)
- **1 matched Tier 2** — payroll sem ref_id, correspondido por fuzzy

**Match rate esperado: ~96%**

---

## Par 3 — Julho 2024 (Problemas Significativos)

| Ficheiro | Descrição |
|----------|-----------|
| `ledger_problematic.csv` | 20 transacções com vários problemas |
| `bank_statement_problematic.csv` | 21 transacções com discrepâncias |

**O que este par demonstra:**
- **Mismatch de valor** — Invoice #2205: ledger $19,750 vs bank $17,500 (diferença $2,250)
- **Mismatch de valor** — Consulting fees: ledger $15,000 vs bank $14,250 (diferença $750)
- **Unmatched A** — Equipment Maintenance $2,800 (no ledger, não aparece no banco)
- **Unmatched A** — Office Renovation Deposit $35,000 (transacção grande em falta)
- **Unmatched A** — Misc Expenses $1,750 (não processado pelo banco)
- **Unmatched B** — Unauthorized Debit $3,500 (débito suspeito sem contrapartida no ledger)
- **Unmatched B** — Bank Wire Fee $65 + Service Charge $250 + Overdraft Fee $75

**Match rate esperado: ~65–70% — ideal para testar Open Items e Resolve**

---

## Como usar

1. Ir a **New Run** (http://localhost:3000/runs/new)
2. Fazer upload do ficheiro **Ledger** (Source A) no lado esquerdo
3. Fazer upload do ficheiro **Bank Statement** (Source B) no lado direito
4. Definir o período (ex: 2024-05-01 a 2024-05-31)
5. Clicar **Start Reconciliation**
6. Aguardar e ver os resultados no **Matching Diagram**
7. Resolver os Open Items na página **Open Items**

---

## Colunas reconhecidas automaticamente

O sistema aceita variações nos nomes das colunas:

**Ledger:** `ref_id` · `date` · `description` · `amount` · `currency` · `category`

**Bank:** `ref_id` · `txn_date` · `description` · `amount` · `currency` · `balance`
