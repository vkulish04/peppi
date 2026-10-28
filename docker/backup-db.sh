#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p backups
STAMP="$(date +%Y%m%d_%H%M%S)"
OUT="backups/kindergarten_${STAMP}.sql.gz"
trap 'rm -f "$OUT"' ERR

echo "Creating ${OUT} ..."
docker compose exec -T db sh -c 'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --triggers "$MYSQL_DATABASE"' | gzip > "$OUT"
test -s "$OUT"
gzip -t "$OUT"
trap - ERR
echo "Backup created: ${OUT}"
