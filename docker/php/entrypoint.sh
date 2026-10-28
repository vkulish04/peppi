#!/bin/sh
set -eu

cd /var/www/html

mkdir -p \
    storage/app/public \
    storage/framework/cache/data \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs \
    bootstrap/cache

chown -R www-data:www-data storage bootstrap/cache
chmod -R ug+rwX storage bootstrap/cache

# --------------------------------------------------------------------------
# APP_KEY
# --------------------------------------------------------------------------
# Якщо APP_KEY не переданий через .env, створюємо його один раз
# і зберігаємо у persistent storage.
if [ -z "${APP_KEY:-}" ]; then
    KEY_FILE="storage/app/.docker_app_key"

    if [ ! -s "$KEY_FILE" ]; then
        OLD_UMASK="$(umask)"
        umask 077

        php -r 'echo "base64:".base64_encode(random_bytes(32)).PHP_EOL;' > "$KEY_FILE"

        umask "$OLD_UMASK"

        chown www-data:www-data "$KEY_FILE"
        chmod 600 "$KEY_FILE"

        echo "[docker] APP_KEY was empty; generated persistent APP_KEY."
    fi

    APP_KEY="$(cat "$KEY_FILE")"
    export APP_KEY
fi

# --------------------------------------------------------------------------
# WAIT FOR MYSQL
# --------------------------------------------------------------------------
if [ "${DB_CONNECTION:-mysql}" = "mysql" ]; then
    DB_HOST_VALUE="${DB_HOST:-db}"
    DB_PORT_VALUE="${DB_PORT:-3306}"

    echo "[docker] Waiting for MySQL at ${DB_HOST_VALUE}:${DB_PORT_VALUE} ..."

    i=0

    until php -r '
        $h = getenv("DB_HOST") ?: "db";
        $p = (int) (getenv("DB_PORT") ?: 3306);

        $s = @fsockopen($h, $p, $errno, $errstr, 1);

        if ($s) {
            fclose($s);
            exit(0);
        }

        exit(1);
    '; do
        i=$((i + 1))

        if [ "$i" -ge 60 ]; then
            echo "[docker] MySQL did not become available in time." >&2
            exit 1
        fi

        sleep 2
    done
fi

# --------------------------------------------------------------------------
# CLEAR OLD LARAVEL CACHE
# --------------------------------------------------------------------------
rm -f bootstrap/cache/*.php

chown -R www-data:www-data storage bootstrap/cache
chmod -R ug+rwX storage bootstrap/cache

php artisan optimize:clear >/dev/null 2>&1 || true

# --------------------------------------------------------------------------
# DATABASE
# --------------------------------------------------------------------------
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
    echo "[docker] Running migrations ..."
    php artisan migrate --force
fi

if [ "${RUN_SEEDERS:-false}" = "true" ]; then
    echo "[docker] Running seeders ..."
    php artisan db:seed --force
fi

# --------------------------------------------------------------------------
# PRODUCTION CACHE
# --------------------------------------------------------------------------
if [ "${APP_ENV:-production}" = "production" ]; then
    echo "[docker] Building Laravel production cache ..."

    php artisan config:cache
    php artisan route:cache
    php artisan view:cache
fi

# --------------------------------------------------------------------------
# FIX PERMISSIONS AFTER ARTISAN
# --------------------------------------------------------------------------
chown -R www-data:www-data storage bootstrap/cache

find storage bootstrap/cache -type d -exec chmod 775 {} \;
find storage bootstrap/cache -type f -exec chmod 664 {} \;

# The generated APP_KEY must remain readable only by its owner.
if [ -f storage/app/.docker_app_key ]; then
    chmod 600 storage/app/.docker_app_key
fi

echo "[docker] Laravel bootstrap completed."

exec "$@"
