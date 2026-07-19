#!/usr/bin/env bash
# Build & deploy each time you update the code. Run from the project root:
#   npm run build   (or:  bash deploy/deploy.sh)
#
#   1. Installs/updates backend deps.
#   2. Moves the static frontend into the nginx web root (needs sudo).
#   3. Restarts the backend service so changes take effect.
#
# Run deploy/setup.sh ONCE first to install the systemd service.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Where nginx serves the static frontend from.
FRONTEND_DEST="/var/www/status"

echo "==> Installing backend dependencies"
npm --prefix "$APP_DIR/api" ci --omit=dev

echo "==> Installing build tools (esbuild)"
npm --prefix "$APP_DIR" ci

echo "==> Minifying frontend -> dist/"
node "$APP_DIR/deploy/minify.js"

echo "==> Moving frontend to $FRONTEND_DEST (sudo)"
sudo mkdir -p "$FRONTEND_DEST"
# --delete keeps the destination in sync (removes files you deleted locally).
sudo rsync -a --delete "$APP_DIR/dist/" "$FRONTEND_DEST/"
sudo chown -R www-data:www-data "$FRONTEND_DEST"

echo "==> Restarting backend service"
sudo systemctl restart status-api

echo "==> Done. Check:  sudo systemctl status status-api"
