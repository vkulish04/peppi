# Stage 3 — Docker

Додано:

- multi-stage `Dockerfile`;
- `compose.yaml` з Nginx + PHP-FPM/Laravel + MySQL 8.4;
- persistent volumes для MySQL і Laravel storage;
- автоматичні міграції під час старту `app`;
- опціональні `scheduler` та `queue` через Compose profile `workers`;
- `.env.docker.example`;
- production PHP/opcache config;
- Nginx config для React SPA + Laravel API;
- `docker/first-run.sh`;
- backup/restore MySQL scripts;
- `DOCKER_DEPLOY_UA.md` — повна методичка;
- `DOCKER_CHEATSHEET.txt` — коротка шпаргалка;
- demo-користувачі тепер створюються тільки при `SEED_DEMO_USERS=true`;
- demo-кнопки на LoginPage вимкнені за замовчуванням.

## Перевірено в цьому середовищі

- PHP syntax: 52 файли — OK;
- `compose.yaml` YAML parse — OK;
- shell syntax для Docker scripts — OK;
- TypeScript зміни не мають синтаксичних помилок при локальному parse; повна перевірка потребує npm dependencies;
- npm install у поточному середовищі не завершився через timeout;
- Docker daemon у поточному середовищі відсутній, тому фактичний `docker compose build/up` тут не запускався.

Перший реальний запуск на машині з Docker рекомендується виконувати за `DOCKER_DEPLOY_UA.md`.
