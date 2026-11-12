#!/usr/bin/env bash
# ============================================
# FINEXA Backend — Production Startup Script
# Runs Alembic migrations, then starts Uvicorn
# ============================================

set -euo pipefail

PORT="${PORT:-8000}"
WORKERS="${WEB_CONCURRENCY:-2}"

echo "============================================"
echo "  FINEXA Backend — Starting Up"
echo "  Port: $PORT | Workers: $WORKERS"
echo "============================================"

# Step 1: Run Alembic database migrations
echo "[1/2] Running Alembic migrations..."
if alembic upgrade head; then
    echo "       Migrations completed successfully."
else
    echo "       [WARNING] Database migrations could not connect to primary database."
    echo "       Continuing startup with local fallback engine..."
fi

# Step 2: Start Uvicorn with production settings
echo "[2/2] Starting Uvicorn server..."
exec uvicorn backend.app.main:app \
    --host 0.0.0.0 \
    --port "$PORT" \
    --workers "$WORKERS" \
    --log-level info \
    --access-log \
    --proxy-headers \
    --forwarded-allow-ips="*"

