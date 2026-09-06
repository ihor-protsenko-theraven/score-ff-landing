# FLAG SCORE

Веб-додаток (live-center) для оперативного суддівського ведення рахунку, хронометражу та публічної трансляції результатів матчів і турнірної таблиці турнірів з флаг-футболу в реальному часі.

---

## 1. Архітектура та стек технологій

- **Runtime & Backend**: Node.js 20+ (нативний ESM), вбудований HTTP-модуль `node:http` для локального оточення та Vercel Serverless Functions для production.
- **Frontend**: Семантичний HTML5, нативний JavaScript (ES Modules, Web Components), CSS3 Design System (athletic dark theme, glassmorphism, responsive 5v5 board). Без зовнішніх CDN-залежностей і веб-шрифтів згідно з політикою Content Security Policy (`font-src 'self'`).
- **Синхронізація клієнта**: Публічне опитування через `fetch('/api/tournament', { cache: 'no-store' })` кожні 10 секунд; локальне кешування введеного пароля адміністратора в `sessionStorage`.
- **Суддівська панель**: touch-first інтерфейс `/judge` для таймера, дауну, періоду та рахунку. Кожна дія точково оновлює лише вибраний матч, а відкрита адмінка підтягує ці зміни кожні 5 секунд, якщо в ній немає незбережених правок.
- **Безпека**:
  - Авторизація адміністратора через заголовок `X-Admin-Password`.
  - Порівняння гешів пароля через `crypto.timingSafeEqual` для захисту від атак за часом (timing attacks).
  - Заголовки безпеки: `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`.

---

## 2. Зберігання та обчислення даних

```
┌────────────────────────────────────────────────────────┐
│               СХОВИЩЕ ДАНИХ (Персистентне)             │
│   Локально: data/tournament.json                       │
│   Production: Vercel Blob (flag-score/tournament.json) │
└──────────────────────────┬─────────────────────────────┘
                           │
                 [ Первинні сутності ]
          teams, divisions, matches, meta, content
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│            ОБЧИСЛЕННЯ ТУРНІРНОЇ ТАБЛИЦІ                │
│     lib/tournament.js -> calculateStandings()          │
│                                                        │
│  - Фільтрація: match.status === 'finished'             │
│  - Агрегація: played, wins, losses, +/- diff, points   │
│  - Тайбрейки: 1) wins, 2) diff, 3) pointsFor, 4) name  │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│                  КЛІЄНТСЬКА ВІДДАЧА                    │
│      GET /api/tournament -> { ...tournament, standings }│
└────────────────────────────────────────────────────────┘
```

### 2.1. Матчі (`matches`) — Первинний персистентний стан
- **Локально**: JSON-документ `data/tournament.json`. Запис реалізовано атомарно у `createFileTournamentStore` (`lib/store.js`) через створення тимчасового файлу `${dataFile}.tmp` та його перейменування через `fs.rename()`.
- **Production (Vercel)**: Приватне об'єктне сховище **Vercel Blob** (`createBlobTournamentStore` у `lib/store.js`) за ключем `flag-score/tournament.json`. Якщо токен відсутній або сховище порожнє, використовується fallback на вбудований `data/tournament.json`.

### 2.2. Турнірна таблиця (`standings`) — Обчислюваний стан (Derived State)
- **Турнірна таблиця не зберігається в базі даних або файлі.** Вона обчислюється динамічно функцією `calculateStandings(teams, matches, division)` (`lib/tournament.js`) під час кожного запиту `GET /api/tournament`.
- **Фільтрація**: Враховуються лише завершені матчі (`status === 'finished'`).
- **Тайбрейки та сортування**:
  1. Кількість перемог (`wins`)
  2. Різниця очок (`difference = pointsFor - pointsAgainst`)
  3. Загальна кількість набраних очок (`pointsFor`)
  4. Алфавітний порядок назви команди (`name.localeCompare`)

### 2.3. Результативні дії матчу

У матчі окремо зберігаються `touchdowns` (6 очок), `conversions` (1 або 2 очки) і `safeties` (2 очки). Кожна подія містить команду, автора, період, час на табло та час створення. Журнал статистики не змінює рахунок автоматично: суддя й надалі коригує офіційний рахунок окремо в блоці «Активні матчі».

### 2.4. Суддівська синхронізація

Суддя входить один раз через `POST /api/judge/verify` і отримує 18-годинний токен, який зберігається на пристрої без збереження пароля. Панель надсилає `PATCH /api/tournament` з дозволеними полями конкретного матчу: рахунок, ігровий час, даун, період, статус і остання дія. Оптимістична версія турніру не дозволяє адмінці випадково перезаписати новіші суддівські дані.

---

## 3. REST API

### `GET /api/tournament`
Повертає структуру турніру разом із динамічно обчисленою турнірною таблицею.
- **Автентифікація**: Не потрібна
- **Заголовки відповіді**: `Cache-Control: no-store`, `Content-Type: application/json`
- **Код 200 OK**:
  ```json
  {
    "meta": { "name": "...", "dates": "...", "venue": "..." },
    "divisions": [{ "id": "mixed", "name": "..." }],
    "teams": [{ "id": "team-1", "name": "...", "color": "#ff0000" }],
    "matches": [
      {
        "id": "match-1",
        "division": "mixed",
        "homeTeamId": "team-1",
        "awayTeamId": "team-2",
        "homeScore": 18,
        "awayScore": 12,
        "status": "live",
        "period": "2-га половина",
        "clock": "05:42",
        "possessionTeamId": "team-1",
        "lastPlay": "...",
        "date": "2026-09-12",
        "time": "11:00",
        "field": "Поле 1",
        "round": "Груповий етап",
        "touchdowns": [
          {
            "id": "td-1",
            "teamId": "team-1",
            "scorer": "№7 Олена К.",
            "period": "1",
            "clock": "05:42",
            "createdAt": "2026-09-12T10:05:00.000Z"
          }
        ],
        "conversions": [
          {
            "id": "xp-1",
            "teamId": "team-1",
            "scorer": "№11 Марія С.",
            "points": 2,
            "period": "1",
            "clock": "05:30",
            "createdAt": "2026-09-12T10:06:00.000Z"
          }
        ]
      }
    ],
    "content": { "rules": "...", "regulations": "..." },
    "standings": {
      "mixed": [
        {
          "id": "team-1",
          "name": "...",
          "played": 1,
          "wins": 1,
          "losses": 0,
          "pointsFor": 18,
          "pointsAgainst": 12,
          "difference": 6
        }
      ]
    }
  }
  ```

### `PUT /api/tournament`
Оновлює повний стан турніру після валідації.
- **Автентифікація**: Обов'язкова (`X-Admin-Password: <ADMIN_PASSWORD>`)
- **Тіло запиту (до 1 МБ)**: JSON із кореневими полями `meta`, `divisions`, `teams`, `matches`, `content`.
- **Валідація** (`validateTournament` у `lib/tournament.js`):
  - Унікальність `id` команд та матчів.
  - Наявність `homeTeamId` та `awayTeamId` у списку зареєстрованих команд (`homeTeamId !== awayTeamId`).
  - Формати дати (`YYYY-MM-DD`), часу (`HH:MM`), невід'ємні числові значення рахунку.
  - Належність автора результативної дії до команди матчу; реалізація може мати лише `1` або `2` очки.
- **Код 200 OK**: `{ "ok": true, "updatedAt": "2026-09-06T00:00:00.000Z" }`
- **Коди помилок**: `400 Bad Request` (помилка валідації), `401 Unauthorized` (невірний пароль).

### `POST /api/admin/verify`
Перевіряє коректність пароля адміністратора для доступу до панелі управління.
- **Автентифікація**: Заголовок `X-Admin-Password`
- **Коди відповідей**: `200 OK` (валідно), `401 Unauthorized` (невірно), `503 Service Unavailable` (пароль не задано на сервері).

### `POST /api/judge/verify`

Обмінює `X-Judge-Password` на 18-годинний Bearer-токен суддівської сесії. Якщо `JUDGE_PASSWORD` не задано, використовується `ADMIN_PASSWORD`.

### `PATCH /api/tournament`

Точково оновлює один матч. Потребує `Authorization: Bearer <judge-token>` і тіло `{ "matchId": "...", "patch": { ... } }`. Зміни інших матчів, команд і текстів турніру не перезаписуються.

---

## 4. Змінні середовища

| Змінна | Середовище | Обов'язкова | Опис |
| --- | --- | --- | --- |
| `ADMIN_PASSWORD` | Local / Vercel | Так (у Prod) | Пароль для зміни даних і доступу до адмінки (дефолт локально: `flag2026`). |
| `JUDGE_PASSWORD` | Local / Vercel | Ні | Окремий пароль суддів. Якщо не задано, суддівська панель приймає `ADMIN_PASSWORD`. |
| `BLOB_READ_WRITE_TOKEN` | Vercel | Так (у Prod) | Токен доступу до сховища Vercel Blob для персистенції даних. |
| `PORT` | Local | Ні | Порт локального сервера (за замовчуванням `3000`). |
| `DATA_FILE` | Local / Test | Ні | Шлях до локального JSON-файлу даних (дефолт: `data/tournament.json`). |

---

## 5. Команди розробки та деплою

```bash
# Встановлення залежностей
npm install

# Запуск локального сервера (http://localhost:3000)
npm start

# Панелі після запуску
# Адмінка: http://localhost:3000/admin
# Суддівська панель: http://localhost:3000/judge

# Запуск локального сервера з автоперезапуском при змінах коду
npm run dev

# Запуск повного набору тестів (node:test)
npm test

# Деплой у Vercel Production
npm run deploy

# Деплой у Vercel Preview
npm run deploy:preview
```
