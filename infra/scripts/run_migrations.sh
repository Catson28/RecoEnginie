#!/bin/bash
# ============================================================
# ReconEngine — Run Database Migrations (Alembic)
# ============================================================
set -e

echo "🔄 Running database migrations..."

cd backend

# Verificar se Alembic está instalado
if ! command -v alembic &> /dev/null; then
    echo "   Installing alembic..."
    pip install alembic --quiet
fi

# Aplicar todas as migrações pendentes
alembic upgrade head

echo "✅ Migrations applied successfully."
echo ""
echo "   Current revision:"
alembic current
