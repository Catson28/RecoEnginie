# ReconEngine — Quick Start (5 minutos)

## Opção A: Docker (recomendado)

```bash
# 1. Configurar
cp .env.example .env

# 2. Iniciar tudo
make up
# ou: docker-compose up -d --build

# 3. Verificar
curl http://localhost:8000/api/health

# 4. (Opcional) Carregar dados de exemplo
make seed

# 5. Abrir
open http://localhost:80
```

---

## Opção B: Desenvolvimento local

```bash
# 1. Instalar dependências
make setup

# 2. Iniciar MySQL via Docker
docker-compose up -d db

# 3. Terminal 1 — Backend
cd backend
uvicorn app.main:app --reload --port 8000

# 4. Terminal 2 — Frontend
cd frontend
npm run dev

# 5. Abrir
open http://localhost:3000
```

---

## Primeira Reconciliação

1. Abrir **http://localhost:3000/runs/new**
2. Fazer upload do ficheiro do ledger (CSV ou OFX)
3. Fazer upload do extracto bancário (CSV ou OFX)
4. Definir o período (ex: 2024-05-01 a 2024-05-31)
5. Clicar **Start Reconciliation**
6. Aguardar o resultado no dashboard

---

## Formato CSV Mínimo

**Ledger (sistema contabilístico):**
```csv
ref_id,date,description,amount,currency
TXN-001,2024-05-01,Wire Transfer Acme,45000.00,USD
TXN-002,2024-05-03,Vendor Payment,12450.00,USD
```

**Bank Statement (extracto bancário):**
```csv
ref_id,txn_date,description,amount
TXN-001,2024-05-01,ACME CORP WIRE,45000.00
TXN-002,2024-05-03,VENDOR PMT,12450.00
BANK-099,2024-05-28,SERVICE CHARGE,250.00
```

---

## Comandos Úteis

```bash
make up       # iniciar todos os serviços
make down     # parar todos os serviços
make logs     # ver logs em tempo real
make test     # correr todos os testes
make seed     # carregar dados de exemplo
make clean    # remover tudo (containers + volumes)
```

---

## URLs

| Serviço | URL |
|---------|-----|
| Interface | http://localhost:80 |
| API | http://localhost:8000 |
| Swagger Docs | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |
