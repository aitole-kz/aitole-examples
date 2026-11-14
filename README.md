# Примеры интеграции Aitole: приём оплаты Kaspi Pay по API

Готовый код, чтобы выставлять QR и счета Kaspi из своего сайта, CRM или бота и узнавать об оплате вебхуком. Node.js, Python, PHP и curl, без зависимостей: копируйте файл в проект.

[Aitole](https://aitole.kz/) — REST API поверх вашей кассы Kaspi Pay: QR, счёт на номер клиента, постоянные ссылки на оплату, регулярные счета, возвраты и вебхуки с подписью. Деньги идут напрямую на ваш Kaspi Pay. Aitole — независимый сервис, не банк и не партнёр АО «Kaspi Bank».

## За минуту в песочнице

1. Зарегистрируйтесь на [aitole.kz](https://aitole.kz/) (вход через Google) и возьмите в кабинете тестовый ключ `sk_test_…`. Kaspi подключать не нужно.
2. Запустите весь путь оплаты: создать QR, «клиент оплатил», дождаться статуса `paid`.

```bash
git clone https://github.com/aitole-kz/aitole-examples && cd aitole-examples
AITOLE_API_KEY=sk_test_… node node/quickstart.mjs
```

```
1. Создан QR: 9a36bf1b-05ba-…, статус pending, ссылка для покупателя: mock_qr_b548778f-…
2. Песочница: покупатель оплатил
3. Статус: paid, оплачено 2026-11-14T18:55:45.495Z, заказ demo-1794682545129
```

Песочница не трогает настоящий Kaspi и деньги, а статус двигает тот же поллер, что и в бою. Тестовым ключом списать настоящие деньги нельзя: `sk_test_` работает только с песочницей.

## Что внутри

| Задача | Node.js | Python | PHP | curl |
|---|---|---|---|---|
| Весь путь в песочнице | [quickstart.mjs](node/quickstart.mjs) | [quickstart.py](python/quickstart.py) | | [quickstart.sh](curl/quickstart.sh) |
| Счёт на номер клиента | [create-invoice.mjs](node/create-invoice.mjs) | | [create-invoice.php](php/create-invoice.php) | |
| Приём вебхука с проверкой подписи | [webhook-server.mjs](node/webhook-server.mjs) | [webhook_server.py](python/webhook_server.py) | [webhook.php](php/webhook.php) | |
| Только проверка подписи | [verify.mjs](node/verify.mjs) | [aitole.py](python/aitole.py) | [verify.php](php/verify.php) | |

Проверка подписи во всех трёх языках сверяется с одним тестовым вектором [test/vector.json](test/vector.json) в CI.

## Как узнать об оплате

Ответ на создание счёта — это статус `pending`, а не оплата. Об оплате сообщает вебхук `payment.paid` через несколько секунд после того, как клиент заплатил:

```
POST https://ваш-сайт/webhooks/aitole
X-Webhook-Timestamp: 1794650000
X-Webhook-Signature: sha256=<hex>

{"id":"evt_…","type":"payment.paid","created_at":"…","data":{"id":"<id операции>","status":"paid","amount":4990}}
```

- Подпись — HMAC-SHA256 от строки `"{timestamp}.{сырое тело}"` секретом эндпоинта. Проверяйте по сырому телу до разбора JSON и отвергайте запросы старше 300 секунд.
- `data.id` — тот же id, что пришёл в ответе на создание счёта. По нему находите заказ, а номер заказа можно положить в `metadata` при создании.
- Если ваш сервер не ответил 2xx, доставка повторится через 1 мин, 5 мин, 30 мин, 2 ч, 6 ч и 24 ч. Обрабатывайте каждое событие один раз по его `id`.
- Пропущенные события можно дочитать из журнала `GET /v2/events`.

Без кода, в Telegram, об оплате тоже приходит «Оплачено»: [как узнать, что клиент оплатил Kaspi](https://aitole.kz/kaspi-uvedomlenie-ob-oplate/).

## Что важно знать до боя

- `Idempotency-Key` обязателен для запросов, создающих платёж. Используйте номер заказа: при повторе запроса счёт не задвоится.
- Ошибка всегда в одном формате: `{"error": {"code", "message", "category", "request_id"}}`. `category` подсказывает, что делать: `temporary` — повторить позже, `permanent` и `validation` — не повторять, а исправить запрос.
- Kaspi может отказать с HTTP 200: тогда у операции `status: "failed"` и `failure_reason`. Проверяйте статус, а не только код ответа.
- Для боевого ключа нужна касса Kaspi Pay и отдельный номер сотрудника с ролью «Кассир». Роль не умеет выводить деньги. Под этим номером нельзя входить в приложение Kaspi Pay: у Kaspi одна сессия на номер.

## Документация

- [Справочник API](https://aitole.kz/docs/) и [он же в markdown](https://aitole.kz/docs/index.md)
- [Плейбук для ИИ-агента](https://aitole.kz/for-ai/): если интеграцию пишет Claude, ChatGPT или Cursor
- [MCP-сервер](https://aitole.kz/docs/#mcp) `https://api.aitole.kz/mcp`: агент работает с платежами напрямую, без кода интеграции
- [Есть ли API у Kaspi Pay и какие есть варианты](https://aitole.kz/kaspi-api/)
- [Счёт Kaspi на номер клиента](https://aitole.kz/kaspi-schet-na-nomer/) · [Регулярные платежи](https://aitole.kz/kaspi-regulyarnye-platezhi/) · [Ссылка на оплату](https://aitole.kz/kaspi-ssylka-na-oplatu/)

Вопросы: [hello@aitole.kz](mailto:hello@aitole.kz) или issue в этом репозитории.

---

## English

Code samples for [Aitole](https://aitole.kz/), a REST API for accepting Kaspi Pay payments in Kazakhstan: QR codes, invoices to a customer's phone number, payment links, recurring invoices, refunds, and signed webhooks. Node.js, Python, PHP and curl, no dependencies.

```bash
AITOLE_API_KEY=sk_test_… node node/quickstart.mjs   # full payment flow in the sandbox
```

Webhooks are signed with HMAC-SHA256 over `"{X-Webhook-Timestamp}.{raw body}"`, sent as `X-Webhook-Signature: sha256=<hex>`; reject requests older than 300 seconds. API reference: [aitole.kz/docs](https://aitole.kz/docs/index.md). Aitole is an independent service, not a bank and not affiliated with Kaspi Bank.

## Лицензия

MIT
