# Етап 1 — React ↔ Laravel API

## Підключено

### Auth

```text
POST /api/v1/auth/login
GET  /api/v1/auth/me
POST /api/v1/auth/logout
```

Токен Sanctum зберігається у `localStorage` тільки якщо увімкнено «Запам'ятати мене». Інакше використовується `sessionStorage`.

### Довідники

```text
GET /api/v1/groups
GET/POST/PUT/DELETE /api/v1/children
GET/POST/PUT/DELETE /api/v1/activities
```

React більше не використовує mock/localStorage для дітей, груп і гуртків.

### Помісячний журнал

```text
GET  /api/v1/journal?year=2026&month=9
POST /api/v1/bills
PUT  /api/v1/bills/{bill}
POST /api/v1/bills/{bill}/payments
DELETE /api/v1/payments/{payment}
```

При зміні галочки гуртка React відправляє повний актуальний набір позицій нарахування. Laravel робить snapshot `name`, `billing_type`, `unit_price` у `monthly_bill_items` і перераховує підсумок на сервері.

### Платежі

Frontend отримує з journal:

- `paid`;
- `debt`;
- `status`;
- список `payments`.

Кнопка «Сплачено» додає платіж на залишок боргу. Якщо оплата вже закрита, скасування платежів вимагає підтвердження.

## Джерело правди

Після збереження journal перезавантажується з Laravel. Для `subtotal`, `discount`, `deductions`, `total` React використовує серверні значення. Локальний калькулятор залишається fallback лише для нового, ще не збереженого запису.

## Етап 2 виконано

Персонал, зарплати, витрати та `SummaryReports` уже переведені на Laravel/MySQL. Див. `INTEGRATION_STAGE2.md`.
