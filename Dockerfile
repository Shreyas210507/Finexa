# ============================================
# FINEXA Backend — Production Dockerfile
# Python 3.13 Slim + Uvicorn
# ============================================

FROM python:3.13-slim AS base

# Prevent Python from writing .pyc files and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# System dependencies for psycopg (libpq) and ReportLab (freetype/jpeg)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libpq-dev \
        libfreetype6-dev \
        libjpeg62-turbo-dev \
        bash \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first (layer cache optimisation)
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy application code
COPY backend/ backend/
COPY alembic.ini alembic.ini  
COPY scripts/ scripts/

# Make startup script executable
RUN chmod +x scripts/start.sh

# Expose port (Render injects $PORT at runtime, default 8000)
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/api/health || exit 1

# Start via entrypoint script (runs Alembic migrations then Uvicorn)
CMD ["bash", "scripts/start.sh"]

