#!/usr/bin/env bash
# One-command deploy. Run from the project root ON THE VPS:
#   npm run deploy   (or:  bash deploy/deploy.sh)
#
# Idempotent: the FIRST run installs the systemd service (via setup.sh);
# EVERY run then:
#   1. Installs/updates backend deps.
#   2. Minifies the static frontend into dist/.
#   3. Moves the static frontend into the nginx web root (needs sudo).
#   4. Restarts the backend service so changes take effect.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Where nginx serves the static frontend from.
FRONTEND_DEST="/var/www/status"

# First-time bootstrap: install the systemd service if it isn't there yet.
SERVICE="/etc/systemd/system/status-api.service"
if [ ! -f "$SERVICE" ]; then
  echo "==> systemd service not found — running one-time setup first"
  bash "$SCRIPT_DIR/setup.sh"
fi

echo "==> Installing backend dependencies"
npm --prefix "$APP_DIR/api" install --omit=dev

echo "==> Installing build tools (esbuild)"
npm --prefix "$APP_DIR" install

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
