// Весь путь оплаты в песочнице за минуту: QR → «клиент оплатил» → статус paid.
//
//   AITOLE_API_KEY=sk_test_… node node/quickstart.mjs
//
// Песочница не трогает настоящий Kaspi и деньги. Статус двигает тот же поллер,
// что и в бою, с той же задержкой в несколько секунд.
import { aitole } from './aitole.mjs';

const orderId = `demo-${Date.now()}`;

const op = await aitole('POST', '/v2/qr', {
  idempotencyKey: orderId,
  body: { amount: 4990, comment: `Заказ ${orderId}`, metadata: { order_id: orderId } },
});
console.log(`1. Создан QR: ${op.id}, статус ${op.status}, ссылка для покупателя: ${op.qr_token}`);

if (!process.env.AITOLE_API_KEY.startsWith('sk_test_')) {
  console.log('Ключ боевой: дальше оплачивает настоящий покупатель. Пример останавливается здесь.');
  process.exit(0);
}

await aitole('POST', `/v2/sandbox/operations/${op.id}/pay`);
console.log('2. Песочница: покупатель оплатил');

for (let i = 0; i < 20; i++) {
  await new Promise((r) => setTimeout(r, 2000));
  const cur = await aitole('GET', `/v2/operations/${op.id}`);
  if (cur.status !== 'pending' && cur.status !== 'created') {
    console.log(`3. Статус: ${cur.status}, оплачено ${cur.paid_at}, заказ ${cur.metadata?.order_id}`);
    process.exit(cur.status === 'paid' ? 0 : 1);
  }
}
console.error('Статус не изменился за 40 секунд');
process.exit(1);
