# Kindergarten Accounting — Laravel + React в одній директорії

Архів містить backend і frontend разом. React лежить у `resources/js`, API — у Laravel `app/` + `routes/api.php`.

> Це source overlay для чистого Laravel 13. Після накладання overlay кінцевий проєкт працює та розгортається як **одна директорія**.

## Кінцева структура

```text
kindergarten/
├── app/                       # Laravel backend
├── bootstrap/
├── database/
├── public/                    # DocumentRoot nginx/Apache
├── resources/
│   ├── js/                    # React / TypeScript frontend
│   └── views/app.blade.php    # SPA shell
├── routes/
│   ├── api.php                # /api/v1/*
│   └── web.php                # React SPA
├── composer.json              # з базового Laravel
├── artisan                    # з базового Laravel
├── package.json
├── vite.config.ts
└── .env
```


### Швидкий варіант: перетворити overlay на повний проєкт у цій же папці

На Linux після розпакування архіву можна виконати:

```bash
./bootstrap_laravel.sh
```

Скрипт створить відсутній Laravel skeleton і `composer.json` **у поточній директорії**, не перезаписуючи файли frontend/backend з архіву. Після цього задайте MySQL credentials у `.env` і запустіть міграції.

## 1. Створити основу Laravel

```bash
composer create-project laravel/laravel kindergarten "^13.0"
cd kindergarten
composer require laravel/sanctum
```

Після цього скопіюйте весь вміст цього архіву поверх директорії `kindergarten`.

> Не запускайте `php artisan install:api`, якщо вже використовуєте міграцію `2026_09_19_000005_create_personal_access_tokens_table.php`, інакше може з'явитися дубль міграції Sanctum.

## 2. `.env`

Скопіюйте `.env.example.fullstack` у `.env` або перенесіть з нього налаштування MySQL.

```env
APP_NAME="Бухгалтерія Дитсадка"
APP_URL=http://127.0.0.1:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=kindergarten
DB_USERNAME=root
DB_PASSWORD=
```

Потім:

```bash
php artisan key:generate
php artisan migrate --seed
```

## 3. Frontend

```bash
npm install
npm run build
```

Для перевірки типів:

```bash
npm run lint
```

Для розробки:

```bash
php artisan serve
```

в іншому терміналі:

```bash
npm run dev
```

Відкрити:

```text
http://127.0.0.1:8000
```

API працює на цьому ж домені:

```text
/api/v1/auth/login
/api/v1/auth/me
/api/v1/groups
/api/v1/children
/api/v1/activities
/api/v1/journal?year=2026&month=9
/api/v1/bills
/api/v1/bills/{id}/payments
/api/v1/employees
/api/v1/payrolls?year=2026&month=9
/api/v1/expenses?year=2026&month=9
/api/v1/reports/monthly?year=2026&month=9
```

## 4. Вхід

У production використовуйте адміністратора з `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Demo-користувачі створюються тільки при `SEED_DEMO_USERS=true`.

Бухгалтер і директор мають право змінювати фінансові дані. Вихователь на цьому етапі має read-only доступ до журналу/довідників.

## 5. Production

DocumentRoot nginx/Apache повинен дивитися на:

```text
/path/to/kindergarten/public
```

Типове оновлення:

```bash
git pull
composer install --no-dev --optimize-autoloader
npm ci
npm run build
php artisan migrate --force
php artisan optimize
```

Laravel і React не потребують двох доменів чи окремого CORS: frontend та `/api/v1` працюють з одного origin.

## Зберігання у браузері

Бізнес-дані більше не зберігаються у `localStorage`: діти, гуртки, журнал, платежі, працівники, зарплати й витрати працюють через Laravel/MySQL.

У браузері зберігається тільки Sanctum bearer token (`localStorage` або `sessionStorage` залежно від «Запам’ятати мене»).
