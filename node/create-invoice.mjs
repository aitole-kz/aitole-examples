// Счёт на номер клиента: приходит ему прямо в приложение Kaspi.
//
//   AITOLE_API_KEY=sk_test_… node node/create-invoice.mjs +77011234567 4990 "Заказ №1024"
import { aitole, AitoleError } from './aitole.mjs';

const [phone, amount, comment = ''] = process.argv.slice(2);
if (!phone || !amount) {
  console.error('Использование: node node/create-invoice.mjs <телефон> <сумма> [комментарий]');
  process.exit(2);
}

// Номер заказа — ключ идемпотентности: сеть оборвалась и вы повторили запрос,
// счёт всё равно будет один. Ключ уникален в пределах аккаунта.
const orderId = comment.replace(/\D+/g, '') || String(Date.now());

try {
  const op = await aitole('POST', '/v2/invoices', {
    idempotencyKey: `order-${orderId}`,
    body: { phone, amount: Number(amount), comment, metadata: { order_id: orderId } },
  });
  // Оплату подтвердит вебхук payment.paid, а не этот ответ.
  console.log(`Счёт ${op.id} отправлен, статус ${op.status}`);
} catch (e) {
  if (e instanceof AitoleError) {
    // Например, 422 payer_not_kaspi_client — номер не клиент Kaspi.
    console.error(`${e.status} ${e.code}: ${e.message} (request_id ${e.requestId})`);
    process.exit(1);
  }
  throw e;
}
