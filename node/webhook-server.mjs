// Приём вебхуков Aitole без фреймворков: проверка подписи и отметка заказа.
//
//   AITOLE_WEBHOOK_SECRET=… node node/webhook-server.mjs
//
// Адрес эндпоинта задаётся в кабинете, там же секрет. Для локальной отладки
// пробросьте порт наружу (cloudflared, ngrok) и нажмите у эндпоинта «Проверить».
import { createServer } from 'node:http';
import { verifyWebhook } from './verify.mjs';

const SECRET = process.env.AITOLE_WEBHOOK_SECRET;
const PORT = Number(process.env.PORT ?? 3000);
if (!SECRET) throw new Error('Задайте AITOLE_WEBHOOK_SECRET');

// Доставка повторяется (1 мин, 5 мин, 30 мин, 2 ч, 6 ч, 24 ч), пока вы не
// ответите 2xx, поэтому одно событие может прийти дважды. В проде храните
// обработанные id в базе, а не в памяти.
const seen = new Set();

createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/webhooks/aitole') {
    res.writeHead(404).end();
    return;
  }
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const raw = Buffer.concat(chunks).toString('utf8');
    const ok = verifyWebhook(SECRET, raw, req.headers['x-webhook-timestamp'], req.headers['x-webhook-signature']);
    if (!ok) {
      res.writeHead(400).end('bad signature');
      return;
    }

    const event = JSON.parse(raw);
    if (seen.has(event.id)) {
      res.writeHead(200).end('duplicate');
      return;
    }
    seen.add(event.id);

    switch (event.type) {
      case 'payment.paid':
        // event.data.id — id операции, который вы получили при создании счёта.
        // По нему находите заказ у себя или берёте metadata: GET /v2/operations/{id}.
        console.log(`Оплачено: операция ${event.data.id}, ${event.data.amount} ₸`);
        break;
      case 'payment.expired':
      case 'payment.cancelled':
        console.log(`Не оплачено (${event.type}): ${event.data.id} ${event.data.failure_reason ?? ''}`);
        break;
      case 'connection.session_expired':
        console.log('Сессия Kaspi оборвалась: новые счета не пройдут до повторного входа по SMS в кабинете');
        break;
      default:
        console.log(`Событие ${event.type}`);
    }
    // Отвечайте быстро: тяжёлую работу — в очередь.
    res.writeHead(200).end('ok');
  });
}).listen(PORT, () => console.log(`Жду вебхуки на http://localhost:${PORT}/webhooks/aitole`));
