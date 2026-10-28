# Validation — Stage 4

Перевірено в середовищі збірки:

- PHP syntax (`php -l`) для backend-файлів — OK;
- нові контролери `ChildAccountController`, `PaymentController`, `ReceiptController` — syntax OK;
- маршрути API додані;
- TypeScript/TSX файли пройшли синтаксичний parse через `tsc` зі stub-модулями; синтаксичних TSX-помилок не виявлено;
- `sh -n docker/php/entrypoint.sh` та `docker compose config --quiet` — OK;
- `docker compose build app web` — OK, включно з production Vite build і перевіркою `public/build/manifest.json`;
- локальний `.env` виключено з Docker build context, а файл згенерованого `APP_KEY` після налаштування прав залишається доступним лише власнику (`600`).

Для запуску після розпакування:

```bash
docker compose build --no-cache app web
docker compose up -d
docker compose logs --tail=100 app
docker compose logs --tail=100 web
```
