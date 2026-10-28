# Етап 2 — персонал, зарплати, витрати та фінансовий звіт

## Що переведено на Laravel / MySQL

### Працівники

```text
GET    /api/v1/employees
POST   /api/v1/employees
PUT    /api/v1/employees/{employee}
DELETE /api/v1/employees/{employee}
```

React більше не зберігає працівників у `localStorage`.

### Зарплатна відомість

```text
GET  /api/v1/payrolls?year=2026&month=9
POST /api/v1/payrolls
PUT  /api/v1/payrolls/{payroll}
```

При першому відкритті місяця Laravel створює `payroll` snapshot для активних працівників. Тому зміна поточного окладу працівника не переписує вже створену історичну відомість.

Статуси backend:

```text
draft
unpaid
paid
```

UI мапить `unpaid/draft` у поточний статус `pending`.

### Операційні витрати

```text
GET    /api/v1/expenses?year=2026&month=9
POST   /api/v1/expenses
PUT    /api/v1/expenses/{expense}
DELETE /api/v1/expenses/{expense}
```

Усі чеки, категорії, суми, постачальники та способи оплати тепер беруться з MySQL.

### Фінансовий звіт

```text
GET /api/v1/reports/monthly?year=2026&month=9
GET /api/v1/reports/monthly/csv?year=2026&month=9
```

Сервер повертає:

- нараховано батькам;
- сплачено за рахунки обраного місяця;
- реальний касовий прихід за календарний місяць;
- борг;
- нараховану зарплату;
- фактично виплачену зарплату;
- операційні витрати;
- результат за методом нарахування;
- фактичний cash flow.

`SummaryReports.tsx` використовує ці серверні суми як джерело правди. Локальний підрахунок лишився тільки fallback.

## Права доступу

Фінансові endpoints і вкладки доступні тільки:

```text
director
accountant
```

Для `educator` вкладки зарплат, витрат і касового звіту приховані.

## localStorage

Бухгалтерські дані більше не зберігаються у `localStorage`.

Залишився лише auth token Sanctum:

- `localStorage` — якщо користувач увімкнув «Запам'ятати мене»;
- `sessionStorage` — якщо не увімкнув.

## Що логічно робити далі

1. UI часткової оплати довільною сумою.
2. Окремий журнал руху платежів.
3. Керування користувачами та ролями.
4. CRUD груп дитсадка в UI.
5. PDF-квитанції на сервері.
6. Audit log для фінансових змін.
7. Резервні копії MySQL.
