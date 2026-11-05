#!/usr/bin/env bash
# att o registro DuckDNS para apontar para o IP público desta VM
# uso: DUCKDNS_DOMAIN=atlas-soscrianca DUCKDNS_TOKEN=xxxx ./duckdns_update.sh
set -euo pipefail

: "${DUCKDNS_DOMAIN:?defina DUCKDNS_DOMAIN (sem .duckdns.org)}"
: "${DUCKDNS_TOKEN:?defina DUCKDNS_TOKEN (encontrado em https://www.duckdns.org)}"

curl -sS "https://www.duckdns.org/update?domains=${DUCKDNS_DOMAIN}&token=${DUCKDNS_TOKEN}&ip="
echo
