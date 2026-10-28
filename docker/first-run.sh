#!/bin/sh
set -eu

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
    echo "Creating .env from .env.docker.example"
    cp .env.docker.example .env
    echo "Edit .env first, replace every CHANGE_ME_* value, then run this script again."
    exit 1
fi

if grep -q 'CHANGE_ME_' .env; then
    echo "Refusing first start: .env still contains CHANGE_ME_* placeholders." >&2
    exit 1
fi

echo "Building and starting Docker services ..."
docker compose up -d --build

echo "Running initial seed ..."
docker compose exec -T app php artisan db:seed --force

echo
echo "Ready. Open: ${APP_URL:-http://localhost:8080}"
echo "Status: docker compose ps"
echo "Logs:   docker compose logs -f web app"
