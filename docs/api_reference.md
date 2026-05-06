# ReconEngine — API Reference

Base URL: `http://localhost:8000/api`

Todos os endpoints retornam JSON. Erros seguem o formato `{"detail": "mensagem"}`.

---

## Health

### GET /health

Verifica estado da API e da base de dados.

**Response 200:**
```json
{
  "status":    "ok",
  "api":       "ok",
  "database":  "ok",
  "engine":    "ReconEngine v1.0.0",
  "timestamp": "2024-06-03T09:15:00Z"
}
```

---

## Runs

### POST /runs

Inicia uma nova reconciliação. Aceita `multipart/form-data`.

**Form fields:**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `ledger_file` | File | ✓ | CSV/XLSX/OFX do sistema contabilístico |
| `bank_file` | File | ✓ | CSV/XLSX/OFX do extracto bancário |
| `period_start` | string (YYYY-MM-DD) | ✓ | Início do período |
| `period_end` | string (YYYY-MM-DD) | ✓ | Fim do período |
| `period_label` | string | — | Nome descritivo (ex: "May 2024") |

**Response 202:**
```json
{
  "run_id":        "3f2a1b4c-...",
  "status":        "PENDING",
  "period_label":  "May 2024",
  "period_start":  "2024-05-01",
  "period_end":    "2024-05-31",
  "ledger_source": "ledger_may.csv",
  "bank_source":   "bank_may.csv",
  "started_at":    "2024-06-03T09:15:00Z",
  ...
}
```

A reconciliação corre em background. Fazer polling a `GET /runs/{run_id}` para acompanhar o progresso.

---

### GET /runs

Lista todos os runs ordenados por data descendente.

**Query params:** `limit` (default 20), `offset` (default 0)

**Response 200:**
```json
{
  "total": 12,
  "items": [ { ...run_summary }, ... ]
}
```

---

### GET /runs/{run_id}

Detalhe completo de um run.

**Run status values:** `PENDING` | `PROCESSING` | `COMPLETED` | `FAILED`

**Response 200:**
```json
{
  "run_id":            "3f2a1b4c-...",
  "status":            "COMPLETED",
  "period_label":      "May 2024",
  "ledger_count":      120,
  "bank_count":        118,
  "matched_count":     112,
  "mismatch_count":    2,
  "unmatched_a_count": 3,
  "unmatched_b_count": 4,
  "probable_count":    5,
  "match_rate":        0.9200,
  "open_items_count":  9,
  "open_value":        78450.00,
  "matched_value":     2485600.00,
  "duration_secs":     45.2,
  ...
}
```

---

### GET /runs/{run_id}/log

Log linha a linha da execução.

**Response 200:**
```json
[
  { "timestamp": "09:15:01", "level": "ok",   "message": "Engine started" },
  { "timestamp": "09:15:02", "level": "info", "message": "Tier 1: 112 matched" },
  { "timestamp": "09:15:03", "level": "warn", "message": "2 mismatches detected" }
]
```

---

### DELETE /runs/{run_id}

Elimina um run e todos os dados associados (cascade). **Response 204.**

---

## Matching

### GET /matching/{run_id}

Lista resultados de matching com filtros opcionais.

**Query params:**

| Param | Valores | Descrição |
|-------|---------|-----------|
| `match_type` | `matched` \| `mismatch` \| `unmatched_a` \| `unmatched_b` \| `probable` | Filtrar por tipo |
| `tier` | `1` \| `2` \| `3` | Filtrar por tier |
| `limit` | int (max 1000) | |
| `offset` | int | |

**Response 200:**
```json
{
  "total":       238,
  "matched":     112,
  "mismatch":    2,
  "unmatched_a": 3,
  "unmatched_b": 4,
  "probable":    5,
  "items": [
    {
      "id":               1,
      "match_type":       "matched",
      "match_tier":       1,
      "confidence_score": 100,
      "match_criteria":   "ref_id + amount + date(±2d)",
      "ledger_ref_id":    "TXN-001",
      "ledger_date":      "2024-05-01",
      "ledger_desc":      "Wire Transfer Acme",
      "ledger_amount":    45000.00,
      "bank_ref_id":      "TXN-001",
      "bank_date":        "2024-05-01",
      "bank_desc":        "ACME CORP WIRE",
      "bank_amount":      45000.00,
      "amount_diff":      0.00,
      "date_diff_days":   0,
      "status":           "resolved"
    }
  ]
}
```

---

### GET /matching/{run_id}/summary

Distribuição de matches por tier para gráficos.

**Response 200:**
```json
{
  "tier1_exact":    98,
  "tier2_fuzzy":    14,
  "tier3_probable": 5,
  "unmatched":      7,
  "total":          124
}
```

---

### GET /matching/{run_id}/export

Descarrega todos os resultados em CSV. **Response: ficheiro CSV.**

---

## Open Items

### GET /open-items

Lista itens em aberto.

**Query params:** `run_id`, `item_type`, `is_resolved` (bool), `priority`, `limit`, `offset`

**item_type values:** `unmatched_a` | `unmatched_b` | `mismatch` | `probable`

**Response 200:**
```json
{
  "total":       24,
  "open":        9,
  "resolved":    15,
  "total_value": 78450.00,
  "items": [...]
}
```

---

### GET /open-items/stats

Estatísticas de open items por tipo.

**Response 200:**
```json
{
  "total_open":  9,
  "total_value": 78450.00,
  "by_type": {
    "mismatch":    { "count": 2, "value": 910.00 },
    "unmatched_a": { "count": 3, "value": 15200.00 },
    "unmatched_b": { "count": 4, "value": 62340.00 }
  }
}
```

---

### PATCH /open-items/resolve

Resolve um ou vários open items.

**Request body:**
```json
{
  "item_ids":        [1, 2, 5],
  "resolver":        "finance@company.com",
  "resolution_type": "timing_diff",
  "notes":           "Transactions posted in different periods — verified with bank statement."
}
```

**resolution_type values:**

| Valor | Descrição |
|-------|-----------|
| `timing_diff` | Diferença de período contabilístico |
| `bank_error` | Erro do banco |
| `ledger_error` | Erro no registo interno |
| `write_off` | Diferença imaterial — write off |
| `fx_diff` | Diferença de câmbio |
| `other` | Outro — requer notas |

**Response 200:**
```json
{
  "resolved_count": 3,
  "message": "3 item(s) marcado(s) como resolvido(s)."
}
```

---

## Reports

### GET /reports/summary

Resumo executivo dos últimos N runs concluídos.

**Query params:** `limit` (default 12)

### GET /reports/trends

Série temporal de match rate por período — para gráficos de linha.

**Response 200:**
```json
[
  { "period": "Mar 2024", "match_rate": 78.0, "open_items": 24, "open_value": 425000.0 },
  { "period": "Apr 2024", "match_rate": 100.0, "open_items": 0, "open_value": 0.0 },
  { "period": "May 2024", "match_rate": 92.0, "open_items": 9, "open_value": 78450.0 }
]
```

### GET /reports/{run_id}/export

Exporta relatório completo de um run em CSV (inclui matching results + open items).
