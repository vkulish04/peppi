# Бухгалтерія дитсадка — Laravel + React

Єдиний full-stack проєкт: Laravel API + React/TypeScript SPA в одній директорії.

Почніть з `FULLSTACK_SETUP.md`.

## Уже підключено до Laravel/MySQL

- реальна авторизація через Laravel Sanctum bearer token;
- відновлення сесії через `/api/v1/auth/me`;
- групи;
- діти: список / створення / редагування / soft delete;
- гуртки та послуги;
- помісячний журнал;
- `monthly_bills` та `monthly_bill_items` зі snapshot цін;
- пропуски, лікарняні, знижки та коригування;
- платежі та статуси `unpaid / partially_paid / paid`;
- працівники;
- помісячні зарплатні відомості зі snapshot окладу;
- операційні витрати;
- серверний фінансовий звіт;
- фінансовий CSV із Laravel;
- рольове обмеження фінансових вкладок для бухгалтера/директора.

Усі бухгалтерські дані зберігаються у MySQL. `localStorage/sessionStorage` використовуються тільки для auth token.

## Основні endpoints

```text
POST /api/v1/auth/login
GET  /api/v1/auth/me

GET  /api/v1/groups
GET  /api/v1/children
GET  /api/v1/activities
GET  /api/v1/journal?year=2026&month=9

GET  /api/v1/employees
GET  /api/v1/payrolls?year=2026&month=9
GET  /api/v1/expenses?year=2026&month=9
GET  /api/v1/reports/monthly?year=2026&month=9
GET  /api/v1/reports/monthly/csv?year=2026&month=9
```

Деталі інтеграції:

- `INTEGRATION_STAGE1.md` — діти, гуртки, журнал, платежі;
- `INTEGRATION_STAGE2.md` — персонал, зарплати, витрати, звіти.

## Користувачі після seed

Для production `SEED_DEMO_USERS=false`: seed створює адміністратора з `ADMIN_EMAIL` / `ADMIN_PASSWORD` у `.env`.

Старі demo-акаунти створюються лише якщо явно встановити `SEED_DEMO_USERS=true`. Швидкі demo-кнопки на LoginPage також вимкнені за замовчуванням.

## Docker deployment

Для Docker додані `Dockerfile`, `compose.yaml`, `.env.docker.example`, Nginx/PHP конфіги, backup/restore scripts і повна українська інструкція.

Швидкий старт:

```bash
cp .env.docker.example .env
# змініть усі CHANGE_ME_* значення
docker compose up -d --build
docker compose exec app php artisan db:seed --force
```

Детально: `DOCKER_DEPLOY_UA.md`.

## Етап 4: платежі та картка дитини
Деталі: `INTEGRATION_STAGE4_PAYMENTS.md`.
