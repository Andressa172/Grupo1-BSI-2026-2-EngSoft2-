#!/usr/bin/env bash
# Renova o certificado Let's Encrypt do ATLAS e recarrega o Nginx.
# Agendar via cron, ex: 0 4 * * * /opt/atlas/infra/scripts/renew_cert.sh >> /var/log/atlas-renew.log 2>&1
set -euo pipefail

APP_DIR="/opt/atlas"

sudo docker compose -f "$APP_DIR/infra/docker-compose.yml" stop nginx
sudo certbot renew --standalone --non-interactive
sudo docker compose -f "$APP_DIR/infra/docker-compose.yml" start nginx
