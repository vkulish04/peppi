#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 backups/file.sql.gz" >&2
    exit 1
fi

FILE="$1"
if [ ! -f "$FILE" ]; then
    echo "Backup not found: $FILE" >&2
    exit 1
fi

cd "$(dirname "$0")/.."
echo "WARNING: this will overwrite data in the current database."
echo "Restoring ${FILE} ..."
gzip -dc "$FILE" | docker compose exec -T db sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'
echo "Restore completed."
