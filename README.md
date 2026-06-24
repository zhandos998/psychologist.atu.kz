# ATU Psychology Tests

Laravel 12 + Inertia React приложение для создания и прохождения психологических тестов, социальных анкет, тестомера настроения и обязательных видео.

## Стек

- Laravel 12
- Inertia React
- Laravel Breeze auth
- SQLite для локального запуска
- MySQL/PostgreSQL поддерживаются миграциями через `.env`

## Быстрый запуск

```bash
composer install
npm install
php artisan key:generate
php artisan migrate:fresh --seed
php artisan storage:link
npm run build
php artisan serve
```

В PowerShell на Windows можно использовать `npm.cmd` вместо `npm`.

## Демо-пользователи

Пароль для всех: `password`.

- `admin@example.com` — admin
- `psychologist@example.com` — psychologist
- `ddm@example.com` — ddm_staff
- `student@example.com` — student

## База данных

Локально проект проверен на SQLite. Для MySQL:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=psychologist
DB_USERNAME=root
DB_PASSWORD=
```

Для PostgreSQL:

```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=psychologist
DB_USERNAME=postgres
DB_PASSWORD=
```

## Что реализовано

- CRUD тестов, вопросов, вариантов, правил подсчета и интерпретаций.
- Роли: `admin`, `psychologist`, `ddm_staff`, `student`.
- Методы подсчета: `simple_sum`, `reverse_questions`, `scale_based`, `max_match_type`, `custom_ranges`, `no_score`.
- Прохождение тестов студентом и отображение результата.
- High-risk интерпретации с рекомендацией обратиться в СПП.
- Email-уведомления через Laravel Mail; телефонные уведомления сохраняются как `pending_provider`.
- Экспорт результатов в CSV и Excel-compatible `.xls`.
- Фильтры результатов по факультету, группе, студенту, тесту и уровню риска.
- Загрузка видео и отметка обязательного просмотра.
- Тестомер настроения и уведомление при 7 днях подряд с низким настроением.

## Сиды из ТЗ СПП

`database/seeders/SppTzSeeder.php` переносит материалы из `Тех.зад СПП (1).docx`:

- 7 психологических опросников: адаптация, HADS, одиночество, психологический стресс, темперамент, тип характера, самооценка Розенберга.
- 3 социальные анкеты: иностранные обучающиеся, качество образования глазами выпускника, удовлетворенность обучением.
- Тестомер настроения.
- 8 обязательных видео-материалов.

После `php artisan migrate:fresh --seed` создается 19 тестов/материалов, 155 вопросов и 676 вариантов ответов.

## Основные файлы

- Миграции: `database/migrations/2026_06_23_000001_create_assessment_tables.php`
- Модели: `app/Models/Test.php`, `Question.php`, `Option.php`, `ScoringRule.php`, `ResultInterpretation.php`, `TestAttempt.php`, `Answer.php`
- Подсчет: `app/Services/TestScoringService.php`
- Уведомления: `app/Services/RiskNotificationService.php`
- Сиды ТЗ СПП: `database/seeders/SppTzSeeder.php`
- Админка: `app/Http/Controllers/Admin`
- React-страницы: `resources/js/Pages`
