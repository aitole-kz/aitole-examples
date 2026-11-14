<?php
/**
 * Счёт на номер клиента через Aitole API. PHP 7.4+, расширение curl.
 *
 *   AITOLE_API_KEY=sk_test_… php php/create-invoice.php +77011234567 4990 "Заказ №1024"
 */

[$_, $phone, $amount, $comment] = array_pad($argv, 4, '');
if ($phone === '' || $amount === '') {
    fwrite(STDERR, "Использование: php php/create-invoice.php <телефон> <сумма> [комментарий]\n");
    exit(2);
}

$orderId = preg_replace('/\D+/', '', $comment) ?: (string) time();

$ch = curl_init((getenv('AITOLE_BASE_URL') ?: 'https://api.aitole.kz') . '/v2/invoices');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'X-API-Key: ' . getenv('AITOLE_API_KEY'),
        'Content-Type: application/json',
        // Повтор с тем же ключом вернёт тот же счёт, а не выставит второй.
        'Idempotency-Key: order-' . $orderId,
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'phone' => $phone,
        'amount' => (int) $amount,
        'comment' => $comment,
        'metadata' => ['order_id' => $orderId],
    ], JSON_UNESCAPED_UNICODE),
]);
$body = json_decode(curl_exec($ch), true);
$status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);

if ($status >= 400) {
    fwrite(STDERR, sprintf("%d %s: %s\n", $status, $body['error']['code'] ?? '', $body['error']['message'] ?? ''));
    exit(1);
}
// Оплату подтвердит вебхук payment.paid, а не этот ответ.
printf("Счёт %s отправлен, статус %s\n", $body['id'], $body['status']);
