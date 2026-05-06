#!/bin/bash
# ============================================================
# ReconEngine — Start Development Environment
# ============================================================
set -e

echo "🚀 Starting ReconEngine development environment..."

# Verificar se .env existe
if [ ! -f .env ]; then
    echo "⚠  .env not found — copying from .env.example"
    cp .env.example .env
    echo "   Edit .env with your credentials before proceeding."
fi

# Instalar dependências do backend
echo "📦 Installing backend dependencies..."
cd backend
pip install -r requirements.txt --quiet
cd ..

# Instalar dependências do frontend
echo "📦 Installing frontend dependencies..."
cd frontend
npm install --silent
cd ..

# Iniciar serviços Docker (só MySQL)
echo "🐳 Starting MySQL..."
docker-compose up -d db

echo "⏳ Waiting for MySQL to be ready..."
sleep 8

# Aplicar schema
echo "📋 Applying database schema..."
docker exec reconengine_db mysql -u recon_app -pchange_me_in_production reconengine \
    < sql/02_create_tables.sql 2>/dev/null || true
docker exec reconengine_db mysql -u recon_app -pchange_me_in_production reconengine \
    < sql/03_views_and_procedures.sql 2>/dev/null || true

echo ""
echo "✅ Ready! Start the servers manually:"
echo ""
echo "  Backend:  cd backend && uvicorn app.main:app --reload --port 8000"
echo "  Frontend: cd frontend && npm run dev"
echo ""
echo "  API Docs: http://localhost:8000/docs"
echo "  App:      http://localhost:3000"
