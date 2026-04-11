#!/bin/bash
# setup-bridge.sh — Install and run MikroTik Bridge API on VPS
# Usage: sudo bash setup-bridge.sh

set -e

APP_DIR="/home/mikrotik-bridge"

echo "=== MikroTik Bridge — Installation ==="

# 1. Node.js
echo "→ [1/4] Node.js..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi
echo "   Node.js $(node -v)"

# 2. PM2
echo "→ [2/4] PM2..."
npm install -g pm2 2>/dev/null

# 3. Setup app
echo "→ [3/4] Installation..."
mkdir -p "$APP_DIR"
cd "$APP_DIR"

# Copy files if not already present
if [ ! -f "$APP_DIR/package.json" ]; then
  echo "   Copie les fichiers mikrotik-bridge/ dans $APP_DIR"
  echo "   puis relance ce script."
  exit 1
fi

npm install

# 4. Create .env if missing
if [ ! -f "$APP_DIR/.env" ]; then
  cp "$APP_DIR/.env.example" "$APP_DIR/.env" 2>/dev/null || true
  echo "   ⚠ Édite le .env avant de démarrer :"
  echo "   nano $APP_DIR/.env"
  exit 0
fi

# 5. Start
echo "→ [4/4] Démarrage..."
pm2 start index.js --name mikrotik-bridge
pm2 save
pm2 startup 2>/dev/null || true

echo ""
echo "=== Bridge API opérationnelle ==="
echo "   Port: $(grep BRIDGE_PORT .env | cut -d= -f2 || echo 4000)"
echo "   PM2:  pm2 status mikrotik-bridge"
echo "   Logs: pm2 logs mikrotik-bridge"
echo ""
echo "   Sur Vercel, ajoute ces vars d'env :"
echo "   MIKROTIK_BRIDGE_URL=http://<IP_VPS>:4000"
echo "   MIKROTIK_BRIDGE_API_KEY=<ta clé>"
