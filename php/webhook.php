<?php
/**
 * Обработчик вебхука Aitole для обычного PHP-хостинга (в том числе рядом с сайтом
 * на WordPress, Bitrix или самописным). Положите файл на сервер, его адрес
 * укажите в кабинете Aitole, секрет — в переменной окружения или конфиге.
 */
require __DIR__ . '/verify.php';

$secret = getenv('AITOLE_WEBHOOK_SECRET') ?: '';
$raw = file_get_contents('php://input');

if (!aitole_verify_webhook(
    $secret,
    $raw,
    $_SERVER['HTTP_X_WEBHOOK_TIMESTAMP'] ?? null,
    $_SERVER['HTTP_X_WEBHOOK_SIGNATURE'] ?? null
)) {
    http_response_code(400);
    exit('bad signature');
}

$event = json_decode($raw, true);

// Доставка повторяется, пока вы не ответите 2xx: одно событие может прийти дважды.
// Проверяйте $event['id'] по своей базе, прежде чем менять заказ.

switch ($event['type']) {
    case 'payment.paid':
        // $event['data']['id'] — id операции из ответа на создание счёта. По нему находите заказ.
        error_log(sprintf('Aitole: оплачено %s, %d ₸', $event['data']['id'], $event['data']['amount']));
        break;
    case 'payment.expired':
    case 'payment.cancelled':
        error_log(sprintf('Aitole: не оплачено (%s) %s', $event['type'], $event['data']['id']));
        break;
}

http_response_code(200);
echo 'ok';
