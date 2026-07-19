#!/usr/bin/env bash
# One-time setup on the VPS. Run AFTER cloning the repo into your home folder.
# Generates a systemd service that runs the backend in place (as your user),
# so nothing needs to be moved into /opt. Run from the project root:
#   npm run setup   (or:  bash deploy/setup.sh)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
RUN_USER="$(whoami)"
NODE_BIN="$(command -v node)"
SERVICE="/etc/systemd/system/status-api.service"

echo "==> Installing backend dependencies"
npm --prefix "$APP_DIR/api" ci --omit=dev

if [ ! -f "$APP_DIR/api/.env" ]; then
  echo "==> Creating api/.env from template — edit it before starting!"
  cp "$APP_DIR/api/.env.example" "$APP_DIR/api/.env"
fi

echo "==> Installing systemd service (user=$RUN_USER, dir=$APP_DIR/api, node=$NODE_BIN)"
sudo tee "$SERVICE" > /dev/null <<EOF
[Unit]
Description=Status dashboard API (Express)
After=network.target

[Service]
Type=simple
User=$RUN_USER
WorkingDirectory=$APP_DIR/api
ExecStart=$NODE_BIN server.js
Restart=on-failure
RestartSec=3
Environment=NODE_ENV=production
Environment=HOST=127.0.0.1
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now status-api

echo "==> Done. Backend running on 127.0.0.1:3000"
echo "    Check with:  sudo systemctl status status-api"
