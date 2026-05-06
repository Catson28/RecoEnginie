#!/bin/bash
# ============================================================
# ReconEngine — Seed Database with Sample Data
# ============================================================
set -e

echo "🌱 Seeding ReconEngine database with sample data..."

# Determinar se MySQL está a correr via Docker ou local
if docker ps | grep -q reconengine_db; then
    echo "   Using Docker MySQL..."
    docker exec -i reconengine_db mysql \
        -u recon_app -pchange_me_in_production reconengine \
        < sql/04_seed_data.sql
else
    echo "   Using local MySQL (requires mysql client)..."
    mysql -u recon_app -p reconengine < sql/04_seed_data.sql
fi

echo "✅ Sample data loaded successfully."
echo "   Open http://localhost:3000/dashboard to see the data."
