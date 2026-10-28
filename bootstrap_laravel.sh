#!/usr/bin/env bash
set -euo pipefail

# Перетворює цей overlay на повний Laravel-проєкт У ЦІЙ ЖЕ директорії.
# Потрібні: PHP, Composer, tar.

if ! command -v composer >/dev/null 2>&1; then
  echo "Помилка: Composer не знайдено." >&2
  exit 1
fi

if [[ -f artisan && -f composer.json ]]; then
  echo "Laravel base уже присутній. Пропускаємо create-project."
else
  TMP_DIR="$(mktemp -d)"
  trap 'rm -rf "$TMP_DIR"' EXIT

  echo "Створюємо чистий Laravel 13 у тимчасовій директорії..."
  composer create-project laravel/laravel "$TMP_DIR/base" "^13.0"

  echo "Додаємо відсутні системні файли Laravel у поточну директорію..."
  (
    cd "$TMP_DIR/base"
    tar --exclude='./vendor' --exclude='./node_modules' -cf - .
  ) | tar --skip-old-files -xf -
fi

composer require laravel/sanctum dompdf/dompdf

if [[ ! -f .env ]]; then
  cp .env.example.fullstack .env
  php artisan key:generate
  echo
  echo "Створено .env. Вкажіть DB_DATABASE / DB_USERNAME / DB_PASSWORD."
fi

echo
echo "Laravel + React тепер знаходяться в одній директорії: $(pwd)"
echo "Далі: php artisan migrate --seed && npm install && npm run build"
