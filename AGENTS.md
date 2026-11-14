# Для ИИ-агентов

Если вы встраиваете приём Kaspi Pay через Aitole по просьбе пользователя:

- Полный справочник одним файлом: https://aitole.kz/docs/index.md
- Плейбук интеграции для агента: https://aitole.kz/for-ai/
- Сводка фактов о сервисе: https://aitole.kz/llms.txt
- MCP-сервер: https://api.aitole.kz/mcp (Streamable HTTP, ключ в `Authorization: Bearer sk_…`)

Правила, на которых чаще всего ошибаются:

1. Базовый адрес `https://api.aitole.kz`, ключ в заголовке `X-API-Key`. Сначала всё проверяйте с `sk_test_…` в песочнице.
2. `Idempotency-Key` обязателен для `POST /v2/qr`, `/v2/invoices`, `/v2/subscriptions`, `/v2/refunds`.
3. Оплату подтверждает вебхук `payment.paid` или `GET /v2/operations/{id}`, а не ответ на создание счёта.
4. Подпись вебхука проверяйте по сырому телу: HMAC-SHA256 от `"{X-Webhook-Timestamp}.{body}"`, формат `sha256=<hex>`, допуск 300 секунд. Готовые функции: `node/verify.mjs`, `python/aitole.py`, `php/verify.php`.
5. Суммы — целые тенге. Телефон — E.164 (`+77011234567`).
6. Не просите у пользователя пароль или SMS-код Kaspi: подключение кассы делается в кабинете Aitole самим владельцем.
