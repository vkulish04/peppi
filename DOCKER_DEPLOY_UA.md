# Методичка: розгортання «Бухгалтерії Дитсадка» у Docker

Цей варіант запускає весь проєкт з однієї директорії. На сервері не потрібно окремо встановлювати PHP, Composer, Node.js або MySQL — вони знаходяться всередині Docker-контейнерів.

## 1. Що запускається

Архітектура:

```text
Браузер
   │
   ▼
Nginx :8080
   │
   ├── React/Vite static build
   │
   └── index.php → PHP-FPM / Laravel 13
                         │
                         ▼
                      MySQL 8.4
```

Контейнери:

- `web` — Nginx, віддає React та проксуює PHP-запити;
- `app` — PHP 8.4 FPM + Laravel 13 + Composer dependencies;
- `db` — MySQL 8.4;
- `scheduler` — опціональний Laravel Scheduler;
- `queue` — опціональний Laravel Queue Worker.

Дані MySQL і Laravel storage зберігаються в Docker volumes, тому звичайний `docker compose down` їх не видаляє.

---

## 2. Найшвидший запуск

### Крок 1. Розпакувати проєкт

```bash
unzip kindergarten-fullstack-stage3-docker.zip
cd kindergarten-fullstack-laravel13
```

### Крок 2. Створити `.env`

Linux/macOS:

```bash
cp .env.docker.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.docker.example .env
```

Відкрити `.env` та ОБОВ'ЯЗКОВО змінити:

```env
DB_PASSWORD=...
MYSQL_PASSWORD=...
MYSQL_ROOT_PASSWORD=...
ADMIN_EMAIL=...
ADMIN_PASSWORD=...
```

`DB_PASSWORD` і `MYSQL_PASSWORD` мають бути однаковими.

Для локального запуску залишити:

```env
APP_URL=http://localhost:8080
APP_BIND=127.0.0.1
APP_PORT=8080
```

`APP_KEY` можна залишити порожнім: контейнер один раз згенерує випадковий ключ і збереже його у persistent storage volume. Для production також можна задати свій `APP_KEY=base64:...`.

### Крок 3. Перший запуск

Linux/macOS:

```bash
./docker/first-run.sh
```

Або вручну, що однаково працює на Linux / Windows / macOS:

```bash
docker compose up -d --build
docker compose exec app php artisan db:seed --force
```

Відкрити:

```text
http://localhost:8080
```

Логін — значення `ADMIN_EMAIL` і `ADMIN_PASSWORD` із `.env`.

---

## 3. Встановлення Docker на Ubuntu Server

Рекомендований варіант — офіційний Docker apt repository.

```bash
sudo apt update
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

sudo tee /etc/apt/sources.list.d/docker.sources >/dev/null <<EOF2
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF2

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Перевірка:

```bash
docker --version
docker compose version
sudo docker run --rm hello-world
```

За бажанням дозволити поточному користувачу запускати Docker без `sudo`:

```bash
sudo usermod -aG docker "$USER"
```

Після цього треба перелогінитися у SSH/сесію.

Офіційна документація Docker:

- https://docs.docker.com/engine/install/ubuntu/
- https://docs.docker.com/compose/install/linux/

---

## 4. Перевірка стану

```bash
docker compose ps
```

Очікувані сервіси:

```text
db    healthy
app   healthy
web   healthy
```

Логи всього стека:

```bash
docker compose logs -f
```

Тільки Laravel + Nginx:

```bash
docker compose logs -f app web
```

Тільки MySQL:

```bash
docker compose logs -f db
```

Laravel health endpoint:

```bash
curl http://localhost:8080/up
```

---

## 5. Корисні Laravel-команди

Виконувати artisan всередині `app`:

```bash
docker compose exec app php artisan about
docker compose exec app php artisan route:list
docker compose exec app php artisan migrate:status
docker compose exec app php artisan optimize:clear
```

Міграції:

```bash
docker compose exec app php artisan migrate --force
```

Seed вручну:

```bash
docker compose exec app php artisan db:seed --force
```

УВАГА: seed використовує `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Не запускайте його без потреби після того, як вручну змінили пароль цього ж адміністратора в системі, інакше він може бути встановлений назад у значення з `.env`.

---

## 6. Demo-користувачі

У production залишити:

```env
SEED_DEMO_USERS=false
```

Якщо це тестовий локальний стенд і потрібні старі demo-акаунти:

```env
SEED_DEMO_USERS=true
```

Потім:

```bash
docker compose exec app php artisan db:seed --force
```

Demo-паролі не можна залишати на сервері, доступному з Інтернету.

---

## 7. Доступ із локальної мережі

За замовчуванням:

```env
APP_BIND=127.0.0.1
```

Тому сайт доступний тільки на самому ПК/сервері.

Для доступу з інших ПК у LAN:

```env
APP_BIND=0.0.0.0
APP_URL=http://IP_СЕРВЕРА:8080
```

Перезапустити `web`:

```bash
docker compose up -d --force-recreate web
```

Після цього відкривати:

```text
http://IP_СЕРВЕРА:8080
```

Не відкривайте порт MySQL `3306` назовні. У цьому compose-файлі він спеціально не опублікований.

---

## 8. Production з доменом та HTTPS

Рекомендована схема:

```text
Internet
  │
  ▼
Host Nginx / Caddy / Traefik :443
  │
  ▼
127.0.0.1:8080
  │
  ▼
Docker web → app → db
```

У `.env`:

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://sadok.example.com
APP_BIND=127.0.0.1
APP_PORT=8080
```

Приклад host Nginx reverse proxy:

```nginx
server {
    listen 80;
    server_name sadok.example.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Після налаштування SSL `APP_URL` має починатися з `https://`.

---

## 9. Backup MySQL

Готовий скрипт:

```bash
./docker/backup-db.sh
```

Отримаємо файл виду:

```text
backups/kindergarten_20260919_203000.sql.gz
```

Рекомендація: робити backup перед оновленням коду/міграціями та окремо копіювати каталог `backups/` на інший сервер або хмарне сховище.

### Restore

```bash
./docker/restore-db.sh backups/kindergarten_20260919_203000.sql.gz
```

Restore перезаписує дані поточної БД — використовувати обережно.

---

## 10. Оновлення проєкту

Перед оновленням:

```bash
./docker/backup-db.sh
```

Після заміни/оновлення файлів:

```bash
docker compose build --pull
docker compose up -d
```

`app` автоматично запускає:

```text
php artisan migrate --force
```

Перевірити:

```bash
docker compose ps
docker compose logs --tail=100 app web
```

React/Vite build також створюється заново під час `docker compose build`.

---

## 11. Scheduler і Queue

За замовчуванням вони не запускаються, бо поточна система їх ще не потребує постійно.

Коли додамо SMS, нагадування, регулярні звіти тощо:

```bash
docker compose --profile workers up -d
```

Перевірка:

```bash
docker compose --profile workers ps
```

Зупинити workers:

```bash
docker compose --profile workers stop scheduler queue
```

---

## 12. Зупинка і перезапуск

Зупинити:

```bash
docker compose stop
```

Запустити:

```bash
docker compose start
```

Перезапустити:

```bash
docker compose restart
```

Видалити контейнери, але ЗБЕРЕГТИ БД:

```bash
docker compose down
```

### Небезпечна команда

```bash
docker compose down -v
```

`-v` видаляє volumes, включно з MySQL data. Це фактично видалення бази. Перед цим обов'язково потрібен backup.

---

## 13. Якщо Docker build не проходить

Показати build без скороченого виводу:

```bash
docker compose build --no-cache --progress=plain
```

Перевірити місце:

```bash
docker system df
```

Очистити тільки невикористані build cache:

```bash
docker builder prune
```

Не використовуйте `docker system prune --volumes`, якщо не розумієте наслідки — можна втратити persistent data.

---

## 14. Якщо Laravel повертає 500

```bash
docker compose logs --tail=200 app
```

Перевірити конфіг:

```bash
docker compose exec app php artisan about
```

Очистити кеш:

```bash
docker compose exec app php artisan optimize:clear
docker compose restart app
```

Перевірити міграції:

```bash
docker compose exec app php artisan migrate:status
```

---

## 15. Якщо не підключається MySQL

```bash
docker compose ps db
docker compose logs --tail=200 db
```

У `.env` всередині Docker повинно бути:

```env
DB_HOST=db
DB_PORT=3306
```

Не `127.0.0.1`: у контейнері `127.0.0.1` — це сам PHP-контейнер, а ім'я сервісу MySQL у Docker network — `db`.

---

## 16. Повне скидання тестового стенду

ТІЛЬКИ якщо дані не потрібні:

```bash
docker compose down -v --remove-orphans
docker compose up -d --build
docker compose exec app php artisan db:seed --force
```

Для production це не використовувати.

---

## 17. Мінімальна пам'ятка

Перший запуск:

```bash
cp .env.docker.example .env
# відредагувати .env
docker compose up -d --build
docker compose exec app php artisan db:seed --force
```

Статус:

```bash
docker compose ps
```

Логи:

```bash
docker compose logs -f app web
```

Backup:

```bash
./docker/backup-db.sh
```

Оновлення:

```bash
./docker/backup-db.sh
docker compose build --pull
docker compose up -d
```

Сайт:

```text
http://localhost:8080
```
