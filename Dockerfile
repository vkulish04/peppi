# syntax=docker/dockerfile:1.7

ARG PHP_VERSION=8.4
ARG NODE_VERSION=22
ARG COMPOSER_VERSION=2

# -----------------------------------------------------------------------------
# 1) Build a complete Laravel 13 application from this overlay and install PHP
#    dependencies. This repository intentionally contains the application code
#    overlay, while the standard Laravel skeleton is created at image build time.
# -----------------------------------------------------------------------------
FROM composer:${COMPOSER_VERSION} AS laravel_builder
WORKDIR /work

COPY . /overlay

RUN composer create-project laravel/laravel /work/app "^13.0" \
        --no-interaction --prefer-dist \
    && cp -a /overlay/. /work/app/ \
    && rm -f /work/app/vite.config.js

WORKDIR /work/app
RUN composer require laravel/sanctum:^4.0 dompdf/dompdf \
        --no-interaction --with-all-dependencies \
    && composer install \
        --no-dev --prefer-dist --no-interaction --optimize-autoloader

# -----------------------------------------------------------------------------
# 2) Build React/Vite assets.
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS frontend_builder

WORKDIR /app

COPY --from=laravel_builder /work/app /app

RUN rm -rf public/build \
    && npm install --no-audit --no-fund \
    && npm run build -- --config vite.config.ts \
    && test -f public/build/manifest.json \
    && grep -q '"resources/js/main.tsx"' public/build/manifest.json \
    && echo "[docker] Vite manifest OK: resources/js/main.tsx found"

# -----------------------------------------------------------------------------
# 3) PHP-FPM runtime.
# -----------------------------------------------------------------------------
FROM php:${PHP_VERSION}-fpm-bookworm AS app

ENV APP_HOME=/var/www/html
WORKDIR ${APP_HOME}

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libcurl4-openssl-dev \
        libicu-dev \
        libonig-dev \
        libzip-dev \
    && docker-php-ext-install -j"$(nproc)" \
        bcmath \
        curl \
        intl \
        mbstring \
        opcache \
        pcntl \
        pdo_mysql \
        zip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=laravel_builder /usr/bin/composer /usr/local/bin/composer
COPY --from=laravel_builder --chown=www-data:www-data /work/app ${APP_HOME}
COPY --from=frontend_builder --chown=www-data:www-data /app/public/build ${APP_HOME}/public/build
COPY docker/php/php.ini /usr/local/etc/php/conf.d/99-kindergarten.ini
COPY docker/php/entrypoint.sh /usr/local/bin/kindergarten-entrypoint

RUN chmod +x /usr/local/bin/kindergarten-entrypoint \
    && mkdir -p \
        storage/app/public \
        storage/framework/cache/data \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs \
        bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

EXPOSE 9000
ENTRYPOINT ["kindergarten-entrypoint"]
CMD ["php-fpm"]

# -----------------------------------------------------------------------------
# 4) Nginx runtime. Only the public directory is needed here; PHP runs in app.
# -----------------------------------------------------------------------------
FROM nginx:1.27-alpine AS web
WORKDIR /var/www/html
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=laravel_builder /work/app/public /var/www/html/public
COPY --from=frontend_builder /app/public/build /var/www/html/public/build
EXPOSE 80
