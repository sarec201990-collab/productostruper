#!/usr/bin/env bash
set -e

# ==============================================================================
# INICIADOR DEL CATÁLOGO DIGITAL TRUPER · FLEXIVOR
# ==============================================================================

export PATH="/home/spanel20/.local/bin:$PATH"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
PORT=5051

echo "=========================================================="
echo "🔧 INICIANDO CATÁLOGO DIGITAL TRUPER (FLEXIVOR)"
echo "=========================================================="

# 1. Compilar backend si no está compilado
if [ ! -f "$BACKEND_DIR/dist/server.js" ]; then
    echo "📦 Compilando backend TypeScript..."
    (cd "$BACKEND_DIR" && npx tsc)
fi

# 2. Compilar frontend si no está compilado
if [ ! -d "$FRONTEND_DIR/dist" ]; then
    echo "⚛️ Compilando frontend React..."
    (cd "$FRONTEND_DIR" && npm run build)
fi

# 3. Iniciar servidor Backend
echo "🚀 Arrancando servidor en http://localhost:$PORT..."
cd "$BACKEND_DIR"
PORT=$PORT node --experimental-sqlite dist/server.js
