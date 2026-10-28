# Етап 4 — картка дитини, часткові платежі та PDF-квитанції

Цей етап завершує основний контур розрахунків **React → Laravel → MySQL**.

## Що додано

- картка/історія дитини з усіма місячними нарахуваннями;
- агрегати по дитині: нараховано, сплачено, загальний борг;
- деталізація snapshot-позицій кожного рахунку;
- історія кількох платежів по одному місяцю;
- форма нового платежу з сумою, датою, способом оплати, референсом та приміткою;
- часткова оплата (`unpaid → partially_paid → paid`);
- редагування існуючого платежу;
- видалення помилкового платежу з автоматичним перерахунком боргу;
- серверна PDF-квитанція із snapshot-цінами та історією платежів;
- кнопка «Історія» в реєстрі дітей;
- кнопки історії/платежу в помісячному журналі;
- дані закладу для PDF можна задати через `.env` перед першим `db:seed`.

## Нові API

```text
GET    /api/v1/children/{child}/account
POST   /api/v1/bills/{bill}/payments
PUT    /api/v1/payments/{payment}
DELETE /api/v1/payments/{payment}
GET    /api/v1/bills/{bill}/receipt.pdf
```

Фінансові API доступні ролям `director` та `accountant`.

## Як працює часткова оплата

Наприклад, рахунок — `5000 грн`:

1. Внесли `3000 грн` → `paid = 3000`, `debt = 2000`, статус `partially_paid`.
2. Внесли ще `1500 грн` → борг `500 грн`.
3. Внесли `500 грн` → борг `0`, статус `paid`.

Laravel не дозволяє випадково записати платіж, більший за поточний борг. При редагуванні платежу ліміт перераховується без урахування самого редагованого платежу.

## PDF

PDF генерується на сервері через `dompdf/dompdf`. У Docker dependency встановлюється автоматично під час build. Для локального Laravel `bootstrap_laravel.sh` також виконує:

```bash
composer require laravel/sanctum dompdf/dompdf
```

Квитанція використовує значення з `monthly_bill_items`, тому зміна актуальної ціни гуртка не змінить стару квитанцію.

## Дані закладу для PDF

Перед першим seed заповніть у `.env`:

```env
KINDERGARTEN_NAME="Назва садочка"
KINDERGARTEN_EDRPOU=12345678
KINDERGARTEN_ADDRESS="м. Київ, ..."
KINDERGARTEN_PHONE="+380..."
KINDERGARTEN_EMAIL="..."
KINDERGARTEN_IBAN="UA..."
KINDERGARTEN_BANK_NAME="Назва банку"
```

Під час першого `php artisan db:seed --force` буде створений запис у `kindergarten_settings`. Повторний seed не перезаписує вже існуючі налаштування.

## Оновлення існуючого Docker deployment

Після заміни файлів проєкту:

```bash
docker compose down
docker compose build --no-cache app web
docker compose up -d
```

Перевірка:

```bash
docker compose ps
docker compose logs --tail=100 app
docker compose logs --tail=100 web
```

Нових міграцій на цьому етапі немає, але entrypoint все одно безпечно виконає `php artisan migrate --force`.

## Основний сценарій у UI

```text
Журнал / Діти
   ↓
Історія дитини
   ↓
Місяць
   ├─ snapshot послуг
   ├─ нараховано
   ├─ перерахунки
   ├─ сплачено
   └─ борг
       ↓
   Платежі
   ├─ додати
   ├─ редагувати
   └─ видалити
       ↓
   PDF-квитанція
```
