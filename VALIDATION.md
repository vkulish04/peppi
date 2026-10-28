# Перевірка цього архіву

Перед пакуванням виконано:

- `php -l` для всіх PHP-файлів `app/`, `database/`, `routes/`, `tests/` — синтаксичних помилок немає;
- `bash -n bootstrap_laravel.sh` — синтаксис OK;
- TypeScript/TSX syntax parse через TypeScript compiler API — синтаксичних помилок немає;
- перевірка відносних import paths у `resources/js`;
- перевірка, що `kindergarten_employees`, `kindergarten_salary_payments`, `kindergarten_expenses` більше не використовуються;
- перевірка, що бізнес-дані більше не записуються у `localStorage`;
- `package.json` валідний JSON.

## Обмеження перевірки в робочому середовищі

Повний `npm install` перевищив доступний час виконання, тому повний `npm run lint` / `npm run build` тут не завершено. Після розпакування виконайте:

```bash
npm install
npm run lint
npm run build
```

Laravel runtime-тести потребують повного Laravel skeleton + Composer dependencies. Для цього використовуйте:

```bash
./bootstrap_laravel.sh
php artisan migrate --seed
```

## Stage 3 Docker validation

- Docker configuration added: `Dockerfile`, `compose.yaml`, Nginx/PHP configs.
- `compose.yaml` successfully parsed as YAML.
- All Docker shell scripts pass `sh -n`.
- All 52 PHP files in the overlay pass `php -l`.
- Docker daemon is not installed in the build environment, so an actual `docker compose build/up` could not be executed here.
- `npm install` in this environment timed out; therefore the final React build should be verified on the target Docker host during `docker compose build`.
